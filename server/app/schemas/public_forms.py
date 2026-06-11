import re
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator

_LEAD_SOURCE_WHITELIST = frozenset({"landing", "popup", "footer", "yoga-bridge"})
_LEAD_LANG_WHITELIST = frozenset({"en", "ru"})


class LeadSubmissionBase(BaseModel):
    """Общие поля для публичных форм заявок."""

    name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=10, max_length=48)
    consent: bool = Field(..., description="Must be true")
    website: str | None = Field(None, description="Honeypot - must be empty")
    captcha_token: str | None = Field(None, description="Cloudflare Turnstile token")
    source: str | None = Field(None, max_length=32)
    lang: str | None = Field(None, max_length=8, description="Site language: en or ru")
    email: EmailStr | None = Field(None, description="Необязательный email для связи")
    utm_source: str | None = Field(None, max_length=256)
    utm_medium: str | None = Field(None, max_length=256)
    utm_campaign: str | None = Field(None, max_length=256)
    utm_content: str | None = Field(None, max_length=256)
    utm_term: str | None = Field(None, max_length=256)
    fbclid: str | None = Field(None, max_length=512)
    meta_event_id: str | None = Field(None, max_length=128, description="Meta Pixel event_id for CAPI dedup")

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("name")
    @classmethod
    def name_letters_only(cls, v: str) -> str:
        if not re.match(r"^[а-яА-ЯёЁa-zA-Z\s\-]+$", v.strip()):
            raise ValueError("Имя может содержать только буквы")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10:
            raise ValueError("Телефон должен содержать минимум 10 цифр")
        if len(digits) > 15:
            raise ValueError("Телефон слишком длинный")
        if digits.startswith("66") and len(digits) == 11 and not re.match(r"^66[689]\d{8}$", digits):
            raise ValueError("Введите корректный тайский номер (+66, затем 9 цифр, начиная с 6, 8 или 9)")
        return v.strip()

    @field_validator("consent")
    @classmethod
    def consent_required(cls, v: bool) -> bool:
        if v is not True:
            raise ValueError("Необходимо согласие с политикой конфиденциальности")
        return v

    @field_validator("source", mode="before")
    @classmethod
    def source_whitelist(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        s = str(v).strip()
        return s if s in _LEAD_SOURCE_WHITELIST else None

    @field_validator("lang", mode="before")
    @classmethod
    def lang_whitelist(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        s = str(v).strip().lower()
        return s if s in _LEAD_LANG_WHITELIST else None

    @field_validator(
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "fbclid",
        "meta_event_id",
        mode="before",
    )
    @classmethod
    def empty_attribution_to_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return str(v).strip()


class ContactRequest(LeadSubmissionBase):
    """POST /api/contact"""


class PackageSlug(str, Enum):
    yoga = "yoga"
    detox = "detox"
    panchakarma = "panchakarma"


class BookingRequest(LeadSubmissionBase):
    procedure: str = Field(..., min_length=1, max_length=300)
    preferred_date: str | None = Field(None, max_length=64)
    departure_date: str | None = Field(None, max_length=64)
    guest_count: int | None = Field(None, ge=1, le=999, description="Approximate number of guests")
    comment: str | None = Field(None, max_length=2000)

    @field_validator("guest_count", mode="before")
    @classmethod
    def guest_count_optional(cls, v):
        if v is None or v == "":
            return None
        return v

    @field_validator("procedure")
    @classmethod
    def procedure_strip(cls, v: str) -> str:
        return v.strip()


class PackageRequest(LeadSubmissionBase):
    package_slug: PackageSlug
