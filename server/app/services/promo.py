"""Server-side promo validation (do not trust client dates)."""

import logging
import re
from datetime import date, datetime, timedelta, timezone

from app.config import settings

logger = logging.getLogger(__name__)

_SOCIAL_HANDLE_RE = re.compile(r"^[a-z0-9._]{0,64}$")


def _bangkok_today() -> date:
    bangkok = timezone(timedelta(hours=7))
    return datetime.now(bangkok).date()


def is_promo_active_on_server() -> bool:
    if not settings.PROMO_ACTIVE:
        return False
    today = _bangkok_today()
    try:
        start = date.fromisoformat(settings.PROMO_START_DATE)
        end = date.fromisoformat(settings.PROMO_END_DATE)
    except ValueError:
        logger.warning("Invalid PROMO_START_DATE or PROMO_END_DATE in config")
        return False
    return start <= today <= end


def sanitize_social_handle(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip().lower()
    if v.startswith("@"):
        v = v[1:]
    if "instagram.com/" in v:
        v = re.sub(r"^https?://(www\.)?instagram\.com/", "", v)
    v = v.split("/")[0].split("?")[0]
    v = re.sub(r"[^a-z0-9._]", "", v)
    v = v[:64]
    if not v or not _SOCIAL_HANDLE_RE.match(v):
        return None
    return v


def count_stay_nights(preferred_date: str | None, departure_date: str | None) -> int | None:
    if not preferred_date or not departure_date:
        return None
    try:
        start = date.fromisoformat(preferred_date[:10])
        end = date.fromisoformat(departure_date[:10])
        nights = (end - start).days
        return nights if nights >= 0 else None
    except ValueError:
        return None


def resolve_promo_fields(
    promo_id: str | None,
    promo_optin: bool,
    social_handle: str | None,
) -> tuple[str | None, bool, str | None]:
    """Validate promo opt-in against server config; log rejected attempts."""
    if not promo_optin:
        return None, False, None

    active = is_promo_active_on_server()
    valid_id = promo_id and promo_id == settings.PROMO_ID

    if not active or not valid_id:
        logger.warning(
            "Rejected promo opt-in attempt",
            extra={
                "promo_id": promo_id,
                "promo_active": active,
                "expected_id": settings.PROMO_ID,
            },
        )
        return None, False, None

    handle = sanitize_social_handle(social_handle)
    return settings.PROMO_ID, True, handle
