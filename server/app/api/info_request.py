"""POST /api/info-request и /api/recipes-request — короткие заявки с /veg/.

Панель «Получить всю информацию» на /veg/: гость оставляет только e-mail,
менеджер отвечает ему письмом с подробной информацией об отеле.
Автоответ гостю не шлём (стандартный текст про звонок по телефону тут не подходит).

Попап «Рецепты от шеф-повара» под мастер-классом: e-mail или телефон (хотя бы одно),
менеджер добавляет гостя в рассылку рецептов.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models import LeadType
from app.schemas.contact import ContactResponse
from app.schemas.public_forms import InfoRequest, RecipesRequest
from app.services.captcha import verify_turnstile_or_skip
from app.services.lead_submission import submit_lead

router = APIRouter()

INFO_REQUEST_LABEL = "Получить всю информацию"
RECIPES_REQUEST_LABEL = "Рецепты от шеф-повара"
_ATTRIBUTION_KEYS = ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid")


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
    for key in _ATTRIBUTION_KEYS:
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


@router.post("/recipes-request", response_model=ContactResponse)
@limiter.limit("5/minute")
def recipes_request(
    request: Request,
    body: RecipesRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    verify_turnstile_or_skip(request, body.captcha_token)
    payload = {"request": RECIPES_REQUEST_LABEL, "lang": body.lang or "ru"}
    if body.email:
        payload["email"] = str(body.email)
    if body.phone:
        payload["phone"] = body.phone
    for key in _ATTRIBUTION_KEYS:
        value = getattr(body, key, None)
        if value:
            payload[key] = value
    submit_lead(
        db,
        request,
        LeadType.RECIPES_REQUEST,
        payload,
        body.website,
        source="veg-recipes",
        background_tasks=background_tasks,
        send_confirmation=False,
    )
    return ContactResponse(message="Спасибо! Скоро пришлём первые рецепты от нашего шеф-повара.")
