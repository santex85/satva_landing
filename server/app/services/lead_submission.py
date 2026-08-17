"""Create lead + consent in DB, then send email notification."""

from fastapi import HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Consent, Lead
from app.services.email import (
    send_lead_confirmation,
    send_lead_notification,
)
from app.services.geoip import resolve_and_store_geo


def submit_lead(
    db: Session,
    request: Request,
    lead_type: str,
    payload: dict,
    honeypot: str | None,
    source: str | None = None,
    background_tasks: BackgroundTasks | None = None,
    promo_id: str | None = None,
    promo_optin: bool = False,
) -> Lead:
    if honeypot and honeypot.strip():
        raise HTTPException(status_code=400, detail="Invalid request")

    lead = Lead(
        type=lead_type,
        payload=payload,
        source=source or "landing",
        promo_id=promo_id,
        promo_optin=promo_optin,
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
    db.refresh(consent)

    if background_tasks and ip_address and consent.id:
        background_tasks.add_task(resolve_and_store_geo, consent.id, ip_address)

    try:
        send_lead_notification(
            lead_type,
            lead.payload,
            lead.created_at,
            source=source,
            db=db,
            promo_optin=lead.promo_optin,
            preferred_date=payload.get("preferred_date"),
            departure_date=payload.get("departure_date"),
        )
    except Exception:
        pass

    try:
        send_lead_confirmation(lead_type, lead.payload, lead.created_at, source=source)
    except Exception:
        pass

    return lead
