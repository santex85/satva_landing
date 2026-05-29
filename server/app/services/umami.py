"""Umami Cloud analytics proxy."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 15.0


def _is_configured() -> bool:
    return bool((settings.UMAMI_API_KEY or "").strip() and (settings.UMAMI_WEBSITE_ID or "").strip())


def _range_to_ms(range_key: str) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    days = 30 if range_key == "30d" else 7
    start = now - timedelta(days=days)
    return int(start.timestamp() * 1000), int(now.timestamp() * 1000)


def _fetch_json(path: str, params: dict[str, Any]) -> dict[str, Any] | list[Any] | None:
    base = (settings.UMAMI_API_BASE or "https://api.umami.is/v1").rstrip("/")
    url = f"{base}{path}"
    headers = {
        "Accept": "application/json",
        "x-umami-api-key": settings.UMAMI_API_KEY.strip(),
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            response = client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning("Umami API request failed", extra={"path": path, "error": str(exc)})
        return None


def get_analytics_summary(range_key: str = "7d") -> dict[str, Any]:
    if not _is_configured():
        return {
            "configured": False,
            "range": range_key,
            "visitors": 0,
            "pageviews": 0,
            "visits": 0,
            "bounces": 0,
            "top_pages": [],
        }

    website_id = settings.UMAMI_WEBSITE_ID.strip()
    start_at, end_at = _range_to_ms(range_key)
    params = {"startAt": start_at, "endAt": end_at}

    stats = _fetch_json(f"/websites/{website_id}/stats", params)
    metrics = _fetch_json(
        f"/websites/{website_id}/metrics",
        {**params, "type": "path", "limit": 10},
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

    return {
        "configured": True,
        "range": range_key,
        "visitors": visitors,
        "pageviews": pageviews,
        "visits": visits,
        "bounces": bounces,
        "top_pages": top_pages,
    }
