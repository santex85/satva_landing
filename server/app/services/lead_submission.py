"""Create lead + consent in DB, then send email notification."""

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Consent, Lead
from app.services.email import send_lead_notification


def submit_lead(
    db: Session,
    request: Request,
    lead_type: str,
    payload: dict,
    honeypot: str | None,
) -> Lead:
    if honeypot and honeypot.strip():
        raise HTTPException(status_code=400, detail="Invalid request")

    lead = Lead(
        type=lead_type,
        payload=payload,
        source="landing",
    )
    db.add(lead)
    db.flush()

    client_host = request.client.host if request.client else None
    forwarded = request.headers.get("x-forwarded-for")
    ip_address = (forwarded.split(",")[0].strip() if forwarded else None) or client_host
    user_agent = request.headers.get("user-agent")
    referer = request.headers.get("referer")

    consent = Consent(
        lead_id=lead.id,
        ip_address=ip_address,
        policy_version=settings.POLICY_VERSION,
        user_agent=user_agent,
        referer=referer,
    )
    db.add(consent)
    db.commit()
    db.refresh(lead)

    try:
        send_lead_notification(lead_type, lead.payload, lead.created_at)
    except Exception:
        pass

    return lead
