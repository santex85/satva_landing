from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import LeadType
from app.schemas.contact import ContactRequest, ContactResponse
from app.services.captcha import verify_turnstile_or_skip
from app.services.lead_submission import submit_lead

router = APIRouter()


@router.post("/contact", response_model=ContactResponse)
@limiter.limit("10/minute")
def contact(
    request: Request,
    body: ContactRequest,
    db: Session = Depends(get_db),
):
    verify_turnstile_or_skip(request, body.captcha_token)
    submit_lead(
        db,
        request,
        LeadType.CONTACT,
        {"name": body.name, "phone": body.phone},
        body.website,
        source=body.source,
    )
    return ContactResponse()
