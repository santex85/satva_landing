from datetime import datetime, timezone

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting

LEAD_NOTIFICATION_EMAILS_KEY = "lead_notification_emails"
UMAMI_SETTINGS_KEY = "umami_settings"
DEFAULT_UMAMI_API_BASE = "https://api.umami.is/v1"
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


def _mask_api_key(api_key: str) -> str:
    cleaned = (api_key or "").strip()
    if not cleaned:
        return ""
    if len(cleaned) <= 4:
        return "••••"
    return "••••" + cleaned[-4:]


def _env_umami_settings() -> dict[str, str]:
    return {
        "api_key": (settings.UMAMI_API_KEY or "").strip(),
        "website_id": (settings.UMAMI_WEBSITE_ID or "").strip(),
        "api_base": (settings.UMAMI_API_BASE or DEFAULT_UMAMI_API_BASE).strip() or DEFAULT_UMAMI_API_BASE,
    }


def _normalize_umami_settings(value: dict[str, str]) -> dict[str, str]:
    api_base = (value.get("api_base") or DEFAULT_UMAMI_API_BASE).strip() or DEFAULT_UMAMI_API_BASE
    if not api_base.startswith(("http://", "https://")):
        raise ValueError("API Base должен начинаться с http:// или https://")
    website_id = (value.get("website_id") or "").strip()
    if not website_id:
        raise ValueError("Укажите Website ID")
    return {
        "api_key": (value.get("api_key") or "").strip(),
        "website_id": website_id,
        "api_base": api_base.rstrip("/"),
    }


def get_umami_settings_raw(db: Session) -> dict[str, str]:
    row = db.query(AppSetting).filter(AppSetting.key == UMAMI_SETTINGS_KEY).first()
    if row and isinstance(row.value, dict):
        return {
            "api_key": str(row.value.get("api_key") or "").strip(),
            "website_id": str(row.value.get("website_id") or "").strip(),
            "api_base": str(row.value.get("api_base") or DEFAULT_UMAMI_API_BASE).strip() or DEFAULT_UMAMI_API_BASE,
        }
    return _env_umami_settings()


def get_umami_settings_public(db: Session) -> dict[str, str | bool]:
    raw = get_umami_settings_raw(db)
    api_key = raw["api_key"]
    return {
        "website_id": raw["website_id"],
        "api_base": raw["api_base"],
        "api_key_set": bool(api_key),
        "api_key_hint": _mask_api_key(api_key),
        "configured": bool(api_key and raw["website_id"]),
    }


def ensure_umami_settings_initialized(db: Session) -> dict[str, str | bool]:
    row = db.query(AppSetting).filter(AppSetting.key == UMAMI_SETTINGS_KEY).first()
    if row and isinstance(row.value, dict) and (row.value.get("website_id") or row.value.get("api_key")):
        return get_umami_settings_public(db)

    env = _env_umami_settings()
    if env["api_key"] or env["website_id"]:
        row = AppSetting(
            key=UMAMI_SETTINGS_KEY,
            value=env,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    return get_umami_settings_public(db)


def set_umami_settings(
    db: Session,
    *,
    website_id: str,
    api_base: str,
    api_key: str | None = None,
) -> dict[str, str | bool]:
    current = get_umami_settings_raw(db)
    next_key = current["api_key"]
    if api_key is not None and api_key.strip():
        next_key = api_key.strip()

    normalized = _normalize_umami_settings(
        {
            "api_key": next_key,
            "website_id": website_id,
            "api_base": api_base,
        }
    )

    row = db.query(AppSetting).filter(AppSetting.key == UMAMI_SETTINGS_KEY).first()
    if row:
        row.value = normalized
        row.updated_at = datetime.now(timezone.utc)
    else:
        row = AppSetting(
            key=UMAMI_SETTINGS_KEY,
            value=normalized,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return get_umami_settings_public(db)
