from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminUserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = Field(pattern="^(owner|manager)$")


class InvitationOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    expires_at: datetime
    invited_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class InvitationPreviewOut(BaseModel):
    email: EmailStr
    role: str


class AcceptInvitationRequest(BaseModel):
    password: str = Field(min_length=8)
