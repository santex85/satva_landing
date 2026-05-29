from datetime import datetime

from pydantic import BaseModel, EmailStr


class AuditLogOut(BaseModel):
    id: int
    action: str
    target_type: str | None
    target_id: str | None
    meta: dict | None
    created_at: datetime
    actor_id: int | None = None
    actor_email: EmailStr | None = None

    class Config:
        from_attributes = True
