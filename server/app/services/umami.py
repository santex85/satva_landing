"""Umami Cloud analytics proxy."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.services.app_settings import get_umami_settings_raw

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 15.0


def _range_to_ms(range_key: str) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    days = 30 if range_key == "30d" else 7
    start = now - timedelta(days=days)
    return int(start.timestamp() * 1000), int(now.timestamp() * 1000)


def _resolve_credentials(db: Session | None) -> dict[str, str]:
    if db is not None:
        return get_umami_settings_raw(db)
    from app.config import settings

    return {
        "api_key": (settings.UMAMI_API_KEY or "").strip(),
        "website_id": (settings.UMAMI_WEBSITE_ID or "").strip(),
        "api_base": (settings.UMAMI_API_BASE or "https://api.umami.is/v1").strip() or "https://api.umami.is/v1",
    }


def _is_configured(credentials: dict[str, str]) -> bool:
    return bool(credentials.get("api_key") and credentials.get("website_id"))


def _fetch_json(
    credentials: dict[str, str],
    path: str,
    params: dict[str, Any],
) -> dict[str, Any] | list[Any] | None:
    api_key = credentials.get("api_key", "").strip()
    api_base = (credentials.get("api_base") or "https://api.umami.is/v1").rstrip("/")
    if not api_key:
        return None

    url = f"{api_base}{path}"
    headers = {
        "Accept": "application/json",
        "x-umami-api-key": api_key,
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            response = client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning("Umami API request failed", extra={"path": path, "error": str(exc)})
        return None


def test_umami_connection(credentials: dict[str, str]) -> tuple[bool, str, int | None]:
    if not _is_configured(credentials):
        return False, "Укажите API key и Website ID", None

    website_id = credentials["website_id"].strip()
    start_at, end_at = _range_to_ms("7d")
    stats = _fetch_json(
        credentials,
        f"/websites/{website_id}/stats",
        {"startAt": start_at, "endAt": end_at},
    )
    if stats is None:
        return False, "Не удалось подключиться к Umami. Проверьте API key, Website ID и API Base.", None

    visitors = int(stats.get("visitors") or 0) if isinstance(stats, dict) else 0
    return True, "Подключение успешно", visitors


def get_analytics_summary(range_key: str = "7d", db: Session | None = None) -> dict[str, Any]:
    credentials = _resolve_credentials(db)
    if not _is_configured(credentials):
        return {
            "configured": False,
            "range": range_key,
            "visitors": 0,
            "pageviews": 0,
            "visits": 0,
            "bounces": 0,
            "top_pages": [],
            "top_referrers": [],
        }

    website_id = credentials["website_id"].strip()
    start_at, end_at = _range_to_ms(range_key)
    params = {"startAt": start_at, "endAt": end_at}

    stats = _fetch_json(credentials, f"/websites/{website_id}/stats", params)
    metrics = _fetch_json(
        credentials,
        f"/websites/{website_id}/metrics",
        {**params, "type": "path", "limit": 10},
    )
    referrer_metrics = _fetch_json(
        credentials,
        f"/websites/{website_id}/metrics",
        {**params, "type": "referrer", "limit": 15},
    )

    visitors = 0
    pageviews = 0
    visits = 0
    bounces = 0
    if isinstance(stats, dict):
        visitors = int(stats.get("visitors") or 0)
        pageviews = int(stats.get("pageviews") or 0)
        visits = int(stats.get("visits") or 0)
        bounces = int(stats.get("bounces") or 0)

    top_pages: list[dict[str, Any]] = []
    if isinstance(metrics, list):
        for item in metrics[:10]:
            if not isinstance(item, dict):
                continue
            top_pages.append(
                {
                    "path": str(item.get("x") or ""),
                    "views": int(item.get("y") or 0),
                }
            )

    top_referrers: list[dict[str, Any]] = []
    if isinstance(referrer_metrics, list):
        for item in referrer_metrics[:15]:
            if not isinstance(item, dict):
                continue
            referrer = str(item.get("x") or "").strip() or "(direct)"
            top_referrers.append(
                {
                    "referrer": referrer,
                    "visits": int(item.get("y") or 0),
                }
            )

    return {
        "configured": True,
        "range": range_key,
        "visitors": visitors,
        "pageviews": pageviews,
        "visits": visits,
        "bounces": bounces,
        "top_pages": top_pages,
        "top_referrers": top_referrers,
    }
