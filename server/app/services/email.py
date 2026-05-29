import logging
from datetime import date, datetime

import resend
from sqlalchemy.orm import Session

from app.config import settings
from app.services.app_settings import get_lead_notification_emails

logger = logging.getLogger(__name__)

_SKIP_KEYS = frozenset({"website", "consent", "captcha_token"})

_FIELD_LABELS: dict[str, str] = {
    "lang": "Сайт",
    "name": "Имя",
    "phone": "Телефон",
    "email": "Email",
    "procedure": "Программа",
    "package_slug": "Пакет",
    "preferred_date": "Дата заезда",
    "departure_date": "Дата выезда",
    "comment": "Комментарий",
    "source": "Источник формы",
}

_FIELD_ORDER = (
    "lang",
    "name",
    "phone",
    "email",
    "procedure",
    "package_slug",
    "preferred_date",
    "departure_date",
    "comment",
    "source",
)

_LEAD_TYPE_LABELS: dict[str, str] = {
    "contact": "Контактная заявка",
    "procedure_booking": "Заявка на бронирование",
    "package_choice": "Выбор пакета",
}

_SOURCE_LABELS: dict[str, str] = {
    "landing": "форма на странице (landing)",
    "popup": "модальное окно (popup)",
    "footer": "подвал сайта (footer)",
    "yoga-bridge": "блок-мост (yoga-bridge)",
}

_LANG_LABELS: dict[str, str] = {
    "en": "Английский сайт (EN)",
    "ru": "Русский сайт (RU)",
}

_PACKAGE_LABELS: dict[str, str] = {
    "yoga": "Йога-тур",
    "detox": "Детокс",
    "panchakarma": "Панчакарма",
}


def _recipients() -> list[str]:
    raw = (settings.RESEND_TO or "").strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def _is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _format_date(value: str) -> str:
    text = value.strip()
    try:
        parsed = date.fromisoformat(text)
        return parsed.strftime("%d.%m.%Y")
    except ValueError:
        return text


def _format_value(key: str, value) -> str | None:
    if _is_empty(value):
        return None

    if key == "source":
        text = str(value).strip()
        label = _SOURCE_LABELS.get(text, text)
        return label

    if key == "lang":
        text = str(value).strip().lower()
        return _LANG_LABELS.get(text, text)

    if key == "package_slug":
        text = str(value).strip()
        return _PACKAGE_LABELS.get(text, text)

    if key in ("preferred_date", "departure_date"):
        return _format_date(str(value))

    return str(value).strip()


def _lead_type_label(lead_type: str) -> str:
    return _LEAD_TYPE_LABELS.get(lead_type, lead_type)


def _site_tag(payload: dict) -> str:
    lang = (payload.get("lang") or "").strip().lower()
    if lang == "en":
        return "EN"
    if lang == "ru":
        return "RU"
    return ""


def _build_body(lead_type: str, payload: dict, created_at: datetime | None, source: str | None) -> str:
    created = (created_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M UTC")
    merged = dict(payload)
    if source and not _is_empty(source):
        merged.setdefault("source", source)

    lines = [
        f"Тип заявки: {_lead_type_label(lead_type)}",
        f"Дата: {created}",
        "",
        "Данные:",
    ]

    seen: set[str] = set()
    for key in _FIELD_ORDER:
        if key in _SKIP_KEYS or key not in merged:
            continue
        formatted = _format_value(key, merged[key])
        if formatted is None:
            continue
        label = _FIELD_LABELS.get(key, key)
        lines.append(f"  {label}: {formatted}")
        seen.add(key)

    for key, value in merged.items():
        if key in seen or key in _SKIP_KEYS:
            continue
        formatted = _format_value(key, value)
        if formatted is None:
            continue
        label = _FIELD_LABELS.get(key, key)
        lines.append(f"  {label}: {formatted}")

    return "\n".join(lines) + "\n"


def send_lead_notification(
    lead_type: str,
    payload: dict,
    created_at: datetime | None = None,
    source: str | None = None,
    db: Session | None = None,
) -> None:
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        logger.warning("Resend not configured, skipping email")
        return

    recipients = get_lead_notification_emails(db) if db is not None else _recipients()
    if not recipients:
        logger.warning("No lead notification recipients configured, skipping email")
        return

    subject = f"Новая заявка с сайта — {_lead_type_label(lead_type)}"
    site_tag = _site_tag(payload)
    if site_tag:
        subject = f"Новая заявка с сайта ({site_tag}) — {_lead_type_label(lead_type)}"
    body = _build_body(lead_type, payload, created_at, source)

    resend.api_key = settings.RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM,
            "to": recipients,
            "subject": subject,
            "text": body,
        })
        logger.info("Lead notification email sent", extra={"lead_type": lead_type})
    except Exception as e:
        logger.error(
            "Failed to send lead notification email",
            extra={"lead_type": lead_type, "error": str(e)},
            exc_info=True,
        )


def send_tawk_ticket_notification(
    lead_type: str,
    payload: dict,
    created_at: datetime | None = None,
    source: str | None = None,
) -> None:
    """Создаёт тикет в Tawk Inbox через ticket forwarding email (официальный обход без REST API)."""
    forward = (settings.TAWK_TICKET_FORWARD_EMAIL or "").strip()
    if not forward:
        return
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        logger.warning("TAWK_TICKET_FORWARD_EMAIL set but Resend is not configured")
        return

    name = (payload.get("name") or "").strip() or "Гость"
    procedure = (payload.get("procedure") or "").strip()
    phone = (payload.get("phone") or "").strip()
    site_tag = _site_tag(payload)
    subject = f"Заявка с сайта — {name}"
    if site_tag:
        subject = f"Заявка с сайта ({site_tag}) — {name}"
    if phone:
        subject = f"{subject} — {phone}"
    if procedure:
        subject = f"{subject} — {procedure[:120]}"

    body = _build_body(lead_type, payload, created_at, source)
    message: dict = {
        "from": settings.RESEND_FROM,
        "to": [forward],
        "subject": subject,
        "text": body,
    }
    email = (payload.get("email") or "").strip()
    if email:
        message["reply_to"] = email

    resend.api_key = settings.RESEND_API_KEY
    try:
        result = resend.Emails.send(message)
    except Exception as e:
        logger.error(
            "Failed to send Tawk ticket email",
            extra={"lead_type": lead_type, "error": str(e)},
            exc_info=True,
        )
        return

    resend_id = result.get("id") if isinstance(result, dict) else None
    logger.info(
        "Tawk ticket email sent",
        extra={"lead_type": lead_type, "lead_name": name, "resend_id": resend_id},
    )
