"""Восстановление пароля админ-пользователей (owner/manager) по email-ссылке."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, bump_token_version
from app.models import AdminUser, AdminPasswordReset
from app.services.audit import log_audit
from app.services.email import send_password_reset

logger = logging.getLogger(__name__)


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def request_password_reset(db: Session, email: str) -> None:
    """Создать токен и отправить письмо. Тихо выходит, если email не найден
    (не раскрываем, какие адреса зарегистрированы)."""
    email = (email or "").strip().lower()
    user = (
        db.query(AdminUser)
        .filter(AdminUser.email == email, AdminUser.is_active == True)
        .first()
    )
    if not user:
        logger.info("Password reset requested for unknown email", extra={"email": email})
        return

    now = datetime.now(timezone.utc)
    pending = (
        db.query(AdminPasswordReset)
        .filter(
            AdminPasswordReset.user_id == user.id,
            AdminPasswordReset.used_at.is_(None),
            AdminPasswordReset.expires_at > now,
        )
        .all()
    )
    for entry in pending:
        entry.used_at = now  # старые ссылки гасим — действует только последняя

    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    reset = AdminPasswordReset(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
        created_at=now,
    )
    db.add(reset)
    db.flush()
    log_audit(
        db,
        actor=user,
        action="auth.password_reset_request",
        target_type="user",
        target_id=str(user.id),
        meta={"email": user.email},
    )
    send_password_reset(email=user.email, raw_token=raw_token, expires_at=expires_at)


def get_reset_by_token(db: Session, raw_token: str) -> AdminPasswordReset:
    token_hash = _hash_token(raw_token)
    reset = (
        db.query(AdminPasswordReset)
        .filter(AdminPasswordReset.token_hash == token_hash)
        .first()
    )
    if not reset:
        raise HTTPException(status_code=404, detail="Ссылка восстановления не найдена")
    if reset.used_at is not None:
        raise HTTPException(status_code=410, detail="Ссылка уже использована")
    if reset.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Срок действия ссылки истёк")
    user = db.query(AdminUser).filter(AdminUser.id == reset.user_id, AdminUser.is_active == True).first()
    if not user:
        raise HTTPException(status_code=410, detail="Пользователь не найден или деактивирован")
    return reset


def reset_password(db: Session, raw_token: str, new_password: str) -> tuple[AdminUser, str]:
    reset = get_reset_by_token(db, raw_token)
    user = db.query(AdminUser).filter(AdminUser.id == reset.user_id).first()

    if verify_password(new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Новый пароль должен отличаться от текущего")

    user.password_hash = get_password_hash(new_password)
    bump_token_version(user)  # инвалидирует все выданные JWT
    reset.used_at = datetime.now(timezone.utc)
    db.flush()
    log_audit(
        db,
        actor=user,
        action="auth.password_reset",
        target_type="user",
        target_id=str(user.id),
        meta={"email": user.email},
    )
    token = create_access_token(subject=str(user.id), token_version=user.token_version)
    return user, token
