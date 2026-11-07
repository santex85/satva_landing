"""POST /api/info-request — заявка из одного e-mail.

Панель «Получить всю информацию» на /veg/: гость оставляет только e-mail,
менеджер отвечает ему письмом с подробной информацией об отеле.
Автоответ гостю не шлём (стандартный текст про звонок по телефону тут не подходит).
"""

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import LeadType
from app.schemas.contact import ContactResponse
from app.schemas.public_forms import InfoRequest
from app.services.captcha import verify_turnstile_or_skip
from app.services.lead_submission import submit_lead

router = APIRouter()

INFO_REQUEST_LABEL = "Получить всю информацию"


@router.post("/info-request", response_model=ContactResponse)
@limiter.limit("5/minute")
def info_request(
    request: Request,
    body: InfoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    verify_turnstile_or_skip(request, body.captcha_token)
    payload = {
        "email": str(body.email),
        "request": INFO_REQUEST_LABEL,
        "lang": body.lang or "ru",
    }
    for key in ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"):
        value = getattr(body, key, None)
        if value:
            payload[key] = value
    submit_lead(
        db,
        request,
        LeadType.INFO_REQUEST,
        payload,
        body.website,
        source="veg-info",
        background_tasks=background_tasks,
        send_confirmation=False,
    )
    return ContactResponse(message="Спасибо! Менеджер отправит подробную информацию на ваш e-mail.")
