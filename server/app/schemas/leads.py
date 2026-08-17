from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.lead import LEAD_STATUSES


class ConsentOut(BaseModel):
    id: int
    consent_at: datetime
    policy_version: str
    ip_address: str | None
    geo_country: str | None = None
    geo_country_code: str | None = None
    geo_city: str | None = None

    class Config:
        from_attributes = True


class LeadOut(BaseModel):
    id: UUID
    type: str
    payload: dict
    created_at: datetime
    source: str | None
    status: str
    archived_at: datetime | None
    promo_id: str | None = None
    promo_optin: bool = False

    class Config:
        from_attributes = True


class LeadDetailOut(LeadOut):
    consents: list[ConsentOut] = []

    class Config:
        from_attributes = True


class LeadUpdate(BaseModel):
    status: str | None = None
    archived: bool | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in LEAD_STATUSES:
            allowed = ", ".join(sorted(LEAD_STATUSES))
            raise ValueError(f"Invalid status. Allowed: {allowed}")
        return value
