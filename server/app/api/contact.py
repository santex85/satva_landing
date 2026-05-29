from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import LeadType
from app.schemas.contact import ContactRequest, ContactResponse
from app.services.captcha import verify_turnstile_or_skip
from app.services.lead_submission import submit_lead
from app.services.tawk import contact_response_with_tawk

router = APIRouter()


@router.post("/contact", response_model=ContactResponse)
@limiter.limit("10/minute")
def contact(
    request: Request,
    body: ContactRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    verify_turnstile_or_skip(request, body.captcha_token)
    payload = {"name": body.name, "phone": body.phone}
    if body.email:
        payload["email"] = body.email
    if body.lang:
        payload["lang"] = body.lang
    submit_lead(
        db,
        request,
        LeadType.CONTACT,
        payload,
        body.website,
        source=body.source,
        background_tasks=background_tasks,
    )
    return contact_response_with_tawk(body.name, body.email, body.phone)
