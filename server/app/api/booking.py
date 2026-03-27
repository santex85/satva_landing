from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import LeadType
from app.schemas.contact import ContactResponse
from app.schemas.public_forms import BookingRequest
from app.services.captcha import verify_turnstile_or_skip
from app.services.lead_submission import submit_lead

router = APIRouter()


@router.post("/booking", response_model=ContactResponse)
@limiter.limit("10/minute")
def booking(
    request: Request,
    body: BookingRequest,
    db: Session = Depends(get_db),
):
    verify_turnstile_or_skip(request, body.captcha_token)
    payload = {
        "name": body.name,
        "phone": body.phone,
        "procedure": body.procedure,
        "preferred_date": body.preferred_date,
        "comment": body.comment,
    }
    submit_lead(
        db,
        request,
        LeadType.PROCEDURE_BOOKING,
        payload,
        body.website,
    )
    return ContactResponse()
