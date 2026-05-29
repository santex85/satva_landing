from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import LeadType
from app.schemas.contact import ContactResponse
from app.schemas.public_forms import PackageRequest
from app.services.captcha import verify_turnstile_or_skip
from app.services.lead_submission import submit_lead
from app.services.tawk import contact_response_with_tawk

router = APIRouter()


@router.post("/package-request", response_model=ContactResponse)
@limiter.limit("10/minute")
def package_request(
    request: Request,
    body: PackageRequest,
    db: Session = Depends(get_db),
):
    verify_turnstile_or_skip(request, body.captcha_token)
    payload = {
        "name": body.name,
        "phone": body.phone,
        "package_slug": body.package_slug.value,
    }
    if body.email:
        payload["email"] = body.email
    if body.lang:
        payload["lang"] = body.lang
    submit_lead(
        db,
        request,
        LeadType.PACKAGE_CHOICE,
        payload,
        body.website,
        source=body.source,
    )
    return contact_response_with_tawk(body.name, body.email, body.phone)
