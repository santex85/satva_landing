from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class ConsentOut(BaseModel):
    id: int
    consent_at: datetime
    policy_version: str
    ip_address: str | None

    class Config:
        from_attributes = True


class LeadOut(BaseModel):
    id: UUID
    type: str
    payload: dict
    created_at: datetime
    source: str | None

    class Config:
        from_attributes = True


class LeadDetailOut(LeadOut):
    consents: list[ConsentOut] = []

    class Config:
        from_attributes = True
