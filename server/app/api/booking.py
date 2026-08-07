import logging

from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import LeadType
from app.schemas.contact import ContactResponse
from app.schemas.public_forms import BookingRequest
from app.services.captcha import verify_turnstile_or_skip
from app.services.lead_submission import submit_lead
from app.services.meta_capi import send_meta_lead_event
from app.services.promo import resolve_promo_fields
from app.services.tawk import contact_response_with_tawk

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/booking", response_model=ContactResponse)
@limiter.limit("10/minute")
def booking(
    request: Request,
    body: BookingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    verify_turnstile_or_skip(request, body.captcha_token)
    payload = {
        "name": body.name,
        "phone": body.phone,
        "procedure": body.procedure,
        "preferred_date": body.preferred_date,
        "departure_date": body.departure_date,
        "guest_count": body.guest_count,
        "comment": body.comment,
    }
    if body.email:
        payload["email"] = body.email
    payload["lang"] = body.lang or "ru"
    for key in ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"):
        value = getattr(body, key, None)
        if value:
            payload[key] = value
    if body.meta_event_id:
        payload["meta_event_id"] = body.meta_event_id

    promo_id, promo_optin, social_handle = resolve_promo_fields(
        body.promo_id,
        body.promo_optin,
        body.social_handle,
    )

    client_host = request.client.host if request.client else None
    forwarded = request.headers.get("x-forwarded-for")
    ip_address = (forwarded.split(",")[0].strip() if forwarded else None) or client_host
    user_agent = request.headers.get("user-agent")
    referer = request.headers.get("referer")

    lead = submit_lead(
        db,
        request,
        LeadType.PROCEDURE_BOOKING,
        payload,
        body.website,
        source=body.source,
        background_tasks=background_tasks,
        promo_id=promo_id,
        promo_optin=promo_optin,
        social_handle=social_handle,
    )

    if body.meta_event_id:
        background_tasks.add_task(
            send_meta_lead_event,
            event_id=body.meta_event_id,
            event_source_url=referer,
            client_ip=ip_address,
            user_agent=user_agent,
            email=str(body.email) if body.email else None,
            phone=body.phone,
            fbclid=body.fbclid,
            event_time=lead.created_at,
        )

    return contact_response_with_tawk(body.name, body.email, body.phone)
