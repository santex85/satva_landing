from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.config import settings
from app.schemas.contact import ContactRequest, ContactResponse
from app.models import Lead, Consent, LeadType
from app.services.email import send_lead_notification
from app.services.amocrm import create_contact_and_lead

router = APIRouter()


@router.post("/contact", response_model=ContactResponse)
@limiter.limit("10/minute")
def contact(
    request: Request,
    body: ContactRequest,
    db: Session = Depends(get_db),
):
    if body.website and body.website.strip():
        raise HTTPException(status_code=400, detail="Invalid request")

    lead = Lead(
        type=LeadType.CONTACT,
        payload={"name": body.name, "phone": body.phone},
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

    try:
        amocrm_id = create_contact_and_lead(
            LeadType.CONTACT,
            body.name,
            body.phone,
        )
        if amocrm_id is not None:
            lead.amocrm_lead_id = amocrm_id
    except Exception:
        pass

    db.commit()
    db.refresh(lead)

    try:
        send_lead_notification(LeadType.CONTACT, lead.payload, lead.created_at)
    except Exception:
        pass

    return ContactResponse()
