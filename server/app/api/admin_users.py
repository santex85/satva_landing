from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import require_role, get_current_user
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.models import AdminUser, AdminInvitation, AdminRole
from app.schemas.admin_users import (
    AdminUserOut,
    AdminUserUpdate,
    InviteRequest,
    InvitationOut,
    InvitationPreviewOut,
    AcceptInvitationRequest,
)
from app.schemas.auth import TokenResponse
from app.services.invitations import (
    create_or_resend_invitation,
    get_invitation_by_token,
    accept_invitation,
    revoke_invitation,
    update_user,
    deactivate_user,
)

router = APIRouter()


@router.get("/admin/users", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    return db.query(AdminUser).order_by(AdminUser.created_at.asc()).all()


@router.patch("/admin/users/{user_id}", response_model=AdminUserOut)
def patch_user(
    user_id: int,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    actor: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    user = update_user(db, actor, user_id, role=body.role, is_active=body.is_active)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/admin/users/{user_id}", response_model=AdminUserOut)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    user = deactivate_user(db, actor, user_id)
    db.commit()
    db.refresh(user)
    return user


@router.post("/admin/users/invite", response_model=InvitationOut)
def invite_user(
    body: InviteRequest,
    db: Session = Depends(get_db),
    actor: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    invitation, _ = create_or_resend_invitation(db, actor=actor, email=str(body.email), role=body.role)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.get("/admin/invitations", response_model=list[InvitationOut])
def list_invitations(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    now = datetime.now(timezone.utc)
    return (
        db.query(AdminInvitation)
        .filter(AdminInvitation.accepted_at.is_(None), AdminInvitation.expires_at > now)
        .order_by(AdminInvitation.created_at.desc())
        .all()
    )


@router.delete("/admin/invitations/{invitation_id}")
def delete_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    actor: AdminUser = Depends(require_role(AdminRole.OWNER)),
):
    revoke_invitation(db, actor, invitation_id)
    db.commit()
    return {"ok": True}


@router.get("/admin/invitations/{token}", response_model=InvitationPreviewOut)
def preview_invitation(token: str, db: Session = Depends(get_db)):
    invitation = get_invitation_by_token(db, token)
    return InvitationPreviewOut(email=invitation.email, role=invitation.role)


@router.post("/admin/invitations/{token}/accept", response_model=TokenResponse)
@limiter.limit("10/15minutes")
def accept_invite(
    request: Request,
    token: str,
    body: AcceptInvitationRequest,
    db: Session = Depends(get_db),
):
    user, access_token = accept_invitation(db, token, body.password)
    db.commit()
    return TokenResponse(access_token=access_token)
