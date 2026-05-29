import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import get_password_hash, create_access_token
from app.models import AdminUser, AdminInvitation, ADMIN_ROLES, AdminRole
from app.services.audit import log_audit
from app.services.email import send_admin_invitation
from app.core.security import bump_token_version


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _active_owner_count(db: Session) -> int:
    return (
        db.query(AdminUser)
        .filter(AdminUser.role == AdminRole.OWNER, AdminUser.is_active == True)
        .count()
    )


def ensure_can_modify_user(db: Session, actor: AdminUser, target: AdminUser, *, new_role: str | None = None, deactivate: bool = False) -> None:
    if actor.id == target.id and deactivate:
        raise HTTPException(status_code=400, detail="Нельзя деактивировать самого себя")
    if actor.id == target.id and new_role and new_role != target.role:
        raise HTTPException(status_code=400, detail="Нельзя изменить свою роль")

    will_lose_owner = False
    if deactivate and target.role == AdminRole.OWNER and target.is_active:
        will_lose_owner = True
    if new_role and target.role == AdminRole.OWNER and new_role != AdminRole.OWNER and target.is_active:
        will_lose_owner = True

    if will_lose_owner and _active_owner_count(db) <= 1:
        raise HTTPException(status_code=400, detail="Нельзя понизить или деактивировать последнего owner")


def create_or_resend_invitation(db: Session, *, actor: AdminUser, email: str, role: str) -> tuple[AdminInvitation, str]:
    email = email.strip().lower()
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Некорректная роль")

    existing_user = db.query(AdminUser).filter(AdminUser.email == email, AdminUser.is_active == True).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    now = datetime.now(timezone.utc)
    pending = (
        db.query(AdminInvitation)
        .filter(
            AdminInvitation.email == email,
            AdminInvitation.accepted_at.is_(None),
            AdminInvitation.expires_at > now,
        )
        .all()
    )
    for inv in pending:
        inv.accepted_at = now  # invalidate old

    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(hours=settings.INVITE_EXPIRE_HOURS)
    invitation = AdminInvitation(
        email=email,
        role=role,
        token_hash=_hash_token(raw_token),
        invited_by=actor.id,
        expires_at=expires_at,
        created_at=now,
    )
    db.add(invitation)
    db.flush()
    log_audit(
        db,
        actor=actor,
        action="user.invite",
        target_type="invitation",
        target_id=str(invitation.id),
        meta={"email": email, "role": role},
    )
    send_admin_invitation(email=email, role=role, raw_token=raw_token, expires_at=expires_at)
    return invitation, raw_token


def get_invitation_by_token(db: Session, raw_token: str) -> AdminInvitation:
    token_hash = _hash_token(raw_token)
    invitation = db.query(AdminInvitation).filter(AdminInvitation.token_hash == token_hash).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Приглашение не найдено")
    if invitation.accepted_at is not None:
        raise HTTPException(status_code=410, detail="Приглашение уже использовано")
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Срок приглашения истёк")
    return invitation


def accept_invitation(db: Session, raw_token: str, password: str) -> tuple[AdminUser, str]:
    invitation = get_invitation_by_token(db, raw_token)
    existing = db.query(AdminUser).filter(AdminUser.email == invitation.email).first()
    if existing and existing.is_active:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")

    now = datetime.now(timezone.utc)
    if existing:
        existing.password_hash = get_password_hash(password)
        existing.role = invitation.role
        existing.is_active = True
        bump_token_version(existing)
        user = existing
    else:
        user = AdminUser(
            email=invitation.email,
            password_hash=get_password_hash(password),
            role=invitation.role,
            is_active=True,
            token_version=0,
            created_at=now,
        )
        db.add(user)

    invitation.accepted_at = now
    db.flush()
    log_audit(
        db,
        actor=user,
        action="user.invite_accept",
        target_type="user",
        target_id=str(user.id),
        meta={"email": user.email, "role": user.role},
    )
    token = create_access_token(subject=str(user.id), token_version=user.token_version)
    return user, token


def revoke_invitation(db: Session, actor: AdminUser, invitation_id: int) -> None:
    invitation = db.query(AdminInvitation).filter(AdminInvitation.id == invitation_id).first()
    if not invitation or invitation.accepted_at is not None:
        raise HTTPException(status_code=404, detail="Приглашение не найдено")
    invitation.accepted_at = datetime.now(timezone.utc)
    log_audit(
        db,
        actor=actor,
        action="user.invite_revoke",
        target_type="invitation",
        target_id=str(invitation.id),
        meta={"email": invitation.email},
    )


def deactivate_user(db: Session, actor: AdminUser, user_id: int) -> AdminUser:
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    ensure_can_modify_user(db, actor, target, deactivate=True)
    target.is_active = False
    bump_token_version(target)
    log_audit(
        db,
        actor=actor,
        action="user.deactivate",
        target_type="user",
        target_id=str(target.id),
        meta={"email": target.email},
    )
    return target


def update_user(db: Session, actor: AdminUser, user_id: int, *, role: str | None = None, is_active: bool | None = None) -> AdminUser:
    target = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if role is not None:
        if role not in ADMIN_ROLES:
            raise HTTPException(status_code=400, detail="Некорректная роль")
        ensure_can_modify_user(db, actor, target, new_role=role)
        if target.role != role:
            old_role = target.role
            target.role = role
            bump_token_version(target)
            log_audit(
                db,
                actor=actor,
                action="user.role_change",
                target_type="user",
                target_id=str(target.id),
                meta={"email": target.email, "from": old_role, "to": role},
            )

    if is_active is not None:
        if not is_active:
            ensure_can_modify_user(db, actor, target, deactivate=True)
            target.is_active = False
            bump_token_version(target)
            log_audit(
                db,
                actor=actor,
                action="user.deactivate",
                target_type="user",
                target_id=str(target.id),
                meta={"email": target.email},
            )
        elif not target.is_active:
            target.is_active = True
            bump_token_version(target)
            log_audit(
                db,
                actor=actor,
                action="user.activate",
                target_type="user",
                target_id=str(target.id),
                meta={"email": target.email},
            )

    return target
