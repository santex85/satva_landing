from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import verify_password, create_access_token, get_password_hash, bump_token_version
from app.models import AdminUser
from app.schemas.auth import LoginRequest, TokenResponse, MeResponse, ChangePasswordRequest
from app.api.deps import get_current_user
from app.services.audit import log_audit

router = APIRouter()


@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/15minutes")
def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(AdminUser).filter(AdminUser.email == body.email, AdminUser.is_active == True).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = create_access_token(subject=str(user.id), token_version=user.token_version or 0)
    log_audit(db, actor=user, action="auth.login", target_type="user", target_id=str(user.id))
    db.commit()
    return TokenResponse(access_token=token)


@router.get("/auth/me", response_model=MeResponse)
def me(user: AdminUser = Depends(get_current_user)):
    return MeResponse(email=user.email, role=user.role)


@router.post("/auth/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: AdminUser = Depends(get_current_user),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Новый пароль должен отличаться от текущего")
    user.password_hash = get_password_hash(body.new_password)
    bump_token_version(user)
    log_audit(db, actor=user, action="auth.password_change", target_type="user", target_id=str(user.id))
    db.commit()
    return {"ok": True}
