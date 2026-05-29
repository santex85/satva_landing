"""IP geolocation via ip-api.com (background lookup)."""

import ipaddress
import logging
from datetime import datetime, timezone

import httpx

from app.core.database import SessionLocal
from app.models import Consent

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 5.0
IP_API_URL = "http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,city&lang=ru"


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip.strip())
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)


def resolve_ip_geo(ip: str) -> dict[str, str] | None:
    cleaned = (ip or "").strip()
    if not cleaned or not _is_public_ip(cleaned):
        return None

    url = IP_API_URL.format(ip=cleaned)
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        logger.warning("IP geolocation request failed", extra={"ip": cleaned, "error": str(exc)})
        return None

    if not isinstance(data, dict) or data.get("status") != "success":
        message = data.get("message") if isinstance(data, dict) else "unknown"
        logger.warning("IP geolocation lookup failed", extra={"ip": cleaned, "message": message})
        return None

    country = str(data.get("country") or "").strip()
    country_code = str(data.get("countryCode") or "").strip().upper()
    city = str(data.get("city") or "").strip()
    if not country and not city:
        return None

    return {
        "geo_country": country or None,
        "geo_country_code": country_code[:2] if country_code else None,
        "geo_city": city or None,
    }


def resolve_and_store_geo(consent_id: int, ip: str) -> None:
    db = SessionLocal()
    try:
        consent = db.query(Consent).filter(Consent.id == consent_id).first()
        if not consent:
            logger.warning("Consent not found for geo lookup", extra={"consent_id": consent_id})
            return

        geo = resolve_ip_geo(ip)
        now = datetime.now(timezone.utc)
        consent.geo_resolved_at = now
        if geo:
            consent.geo_country = geo.get("geo_country")
            consent.geo_country_code = geo.get("geo_country_code")
            consent.geo_city = geo.get("geo_city")
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to store IP geolocation", extra={"consent_id": consent_id, "error": str(exc)})
    finally:
        db.close()
