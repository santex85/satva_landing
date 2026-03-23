from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import verify_password, create_access_token
from app.config import settings
from app.models import AdminUser
from app.schemas.auth import LoginRequest, TokenResponse

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
    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)
