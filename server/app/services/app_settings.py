from datetime import datetime, timezone

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting

LEAD_NOTIFICATION_EMAILS_KEY = "lead_notification_emails"
_email_list_adapter = TypeAdapter(list[EmailStr])


def _env_recipients() -> list[str]:
    raw = (settings.RESEND_TO or "").strip()
    if not raw:
        return []
    return [x.strip().lower() for x in raw.split(",") if x.strip()]


def _normalize_emails(emails: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for email in emails:
        cleaned = email.strip().lower()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        normalized.append(cleaned)
    return normalized


def _validate_emails(emails: list[str]) -> list[str]:
    normalized = _normalize_emails(emails)
    if not normalized:
        raise ValueError("Укажите хотя бы один email")
    try:
        validated = _email_list_adapter.validate_python(normalized)
    except ValidationError as exc:
        raise ValueError("Некорректный формат email") from exc
    return [str(email) for email in validated]


def get_lead_notification_emails(db: Session) -> list[str]:
    row = db.query(AppSetting).filter(AppSetting.key == LEAD_NOTIFICATION_EMAILS_KEY).first()
    if row and isinstance(row.value, list) and row.value:
        return _normalize_emails([str(x) for x in row.value])
    return _env_recipients()


def ensure_lead_notification_emails_initialized(db: Session) -> list[str]:
    row = db.query(AppSetting).filter(AppSetting.key == LEAD_NOTIFICATION_EMAILS_KEY).first()
    if row and isinstance(row.value, list) and row.value:
        return _normalize_emails([str(x) for x in row.value])

    env_emails = _env_recipients()
    if env_emails:
        row = AppSetting(
            key=LEAD_NOTIFICATION_EMAILS_KEY,
            value=env_emails,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return env_emails

    return []


def set_lead_notification_emails(db: Session, emails: list[str]) -> list[str]:
    validated = _validate_emails(emails)
    row = db.query(AppSetting).filter(AppSetting.key == LEAD_NOTIFICATION_EMAILS_KEY).first()
    if row:
        row.value = validated
        row.updated_at = datetime.now(timezone.utc)
    else:
        row = AppSetting(
            key=LEAD_NOTIFICATION_EMAILS_KEY,
            value=validated,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return validated
