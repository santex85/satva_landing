"""Meta Conversions API — server-side Lead events with browser deduplication."""

from __future__ import annotations

import hashlib
import logging
import re
import time
from datetime import datetime

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_GRAPH_API_VERSION = "v21.0"


def _sha256_normalized(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _normalize_phone(phone: str) -> str | None:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) < 10:
        return None
    return digits


def _normalize_email(email: str) -> str | None:
    normalized = (email or "").strip().lower()
    return normalized or None


def _build_fbc(fbclid: str | None) -> str | None:
    if not fbclid:
        return None
    return f"fb.1.{int(time.time() * 1000)}.{fbclid}"


def send_meta_lead_event(
    *,
    event_id: str,
    event_source_url: str | None,
    client_ip: str | None,
    user_agent: str | None,
    email: str | None = None,
    phone: str | None = None,
    fbclid: str | None = None,
    event_time: datetime | None = None,
) -> None:
    pixel_id = (settings.META_PIXEL_ID or "").strip()
    access_token = (settings.META_CAPI_TOKEN or "").strip()
    if not pixel_id or not access_token or not event_id:
        return

    user_data: dict[str, object] = {}
    normalized_email = _normalize_email(email or "")
    if normalized_email:
        user_data["em"] = [_sha256_normalized(normalized_email)]
    normalized_phone = _normalize_phone(phone or "")
    if normalized_phone:
        user_data["ph"] = [_sha256_normalized(normalized_phone)]
    if client_ip:
        user_data["client_ip_address"] = client_ip
    if user_agent:
        user_data["client_user_agent"] = user_agent
    fbc = _build_fbc(fbclid)
    if fbc:
        user_data["fbc"] = fbc

    ts = int((event_time or datetime.utcnow()).timestamp())
    payload = {
        "data": [
            {
                "event_name": "Lead",
                "event_time": ts,
                "event_id": event_id,
                "action_source": "website",
                "event_source_url": event_source_url or settings.SITE_BASE_URL,
                "user_data": user_data,
            }
        ]
    }

    url = f"https://graph.facebook.com/{_GRAPH_API_VERSION}/{pixel_id}/events"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                url,
                params={"access_token": access_token},
                json=payload,
            )
            if response.status_code >= 400:
                logger.warning(
                    "Meta CAPI Lead event failed",
                    extra={"status": response.status_code, "body": response.text[:500]},
                )
            else:
                logger.info("Meta CAPI Lead event sent", extra={"event_id": event_id})
    except Exception as exc:
        logger.error("Meta CAPI request error", extra={"error": str(exc)}, exc_info=True)
