import logging
from datetime import datetime

import resend

from app.config import settings

logger = logging.getLogger(__name__)


def _recipients() -> list[str]:
    raw = (settings.RESEND_TO or "").strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def send_lead_notification(lead_type: str, payload: dict, created_at: datetime | None = None) -> None:
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        logger.warning("Resend not configured, skipping email")
        return

    recipients = _recipients()
    if not recipients:
        logger.warning("RESEND_TO has no recipients, skipping email")
        return

    created = (created_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M UTC")
    subject = f"Новая заявка с сайта — {lead_type}"
    body = f"""Тип заявки: {lead_type}
Дата: {created}

Данные:
"""
    for k, v in payload.items():
        body += f"  {k}: {v}\n"

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
