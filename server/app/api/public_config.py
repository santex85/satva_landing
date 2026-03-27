from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/public-config")
def public_config():
    """Публичные настройки для фронта (без секретов)."""
    return {
        "turnstileSiteKey": (settings.TURNSTILE_SITE_KEY or "").strip(),
    }
