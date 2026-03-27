import logging
import smtplib
import ssl
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def _smtp_recipients() -> list[str]:
    raw = (settings.SMTP_TO or "").strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def send_lead_notification(lead_type: str, payload: dict, created_at: datetime | None = None) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_TO:
        logger.warning("SMTP not configured, skipping email")
        return

    recipients = _smtp_recipients()
    if not recipients:
        logger.warning("SMTP_TO has no recipients, skipping email")
        return

    from_addr = (settings.SMTP_FROM or settings.SMTP_USER or "").strip()
    if not from_addr:
        logger.warning("SMTP_FROM and SMTP_USER empty, skipping email")
        return

    created = (created_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M UTC")
    subject = f"Новая заявка с сайта — {lead_type}"
    body = f"""Тип заявки: {lead_type}
Дата: {created}

Данные:
"""
    for k, v in payload.items():
        body += f"  {k}: {v}\n"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(body, "plain", "utf-8"))

    use_ssl = settings.SMTP_USE_SSL or settings.SMTP_PORT == 465
    auth = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    ctx = ssl.create_default_context()

    try:
        if use_ssl:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx) as server:
                if auth:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, recipients, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if auth:
                    server.starttls(context=ctx)
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, recipients, msg.as_string())
        logger.info("Lead notification email sent", extra={"lead_type": lead_type})
    except Exception as e:
        logger.error("Failed to send lead notification email", extra={"lead_type": lead_type, "error": str(e)}, exc_info=True)
