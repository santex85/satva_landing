import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


def send_lead_notification(lead_type: str, payload: dict, created_at: datetime | None = None) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_TO:
        logger.warning("SMTP not configured, skipping email")
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
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = settings.SMTP_TO
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM or settings.SMTP_USER, settings.SMTP_TO.split(","), msg.as_string())
        logger.info("Lead notification email sent", extra={"lead_type": lead_type})
    except Exception as e:
        logger.error("Failed to send lead notification email", extra={"lead_type": lead_type, "error": str(e)}, exc_info=True)
