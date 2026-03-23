import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _base_url() -> str:
    subdomain = (settings.AMOCRM_SUBDOMAIN or "").strip()
    if not subdomain:
        return ""
    return f"https://{subdomain}.amocrm.ru/api/v4"


def _headers() -> dict[str, str]:
    token = (settings.AMOCRM_ACCESS_TOKEN or "").strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def create_contact_and_lead(lead_type: str, name: str, phone: str) -> int | None:
    base = _base_url()
    headers = _headers()
    if not base or not headers.get("Authorization"):
        logger.warning("amoCRM not configured, skipping")
        return None

    try:
        with httpx.Client(timeout=15.0) as client:
            contact_payload = {
                "name": name or "Без имени",
                "custom_fields_values": [
                    {"field_code": "PHONE", "values": [{"value": phone, "enum_code": "WORK"}]}
                ],
            }
            r_contact = client.post(f"{base}/contacts", headers=headers, json=[contact_payload])
            r_contact.raise_for_status()
            data_contact = r_contact.json()
            if not data_contact.get("_embedded", {}).get("contacts"):
                logger.error("amoCRM: no contact in response", extra={"response": data_contact})
                return None
            contact_id = data_contact["_embedded"]["contacts"][0]["id"]

            lead_name = f"Заявка с сайта — {lead_type}"
            lead_payload = {
                "name": lead_name,
                "_embedded": {"contacts": [{"id": contact_id}]},
            }
            r_lead = client.post(f"{base}/leads", headers=headers, json=[lead_payload])
            r_lead.raise_for_status()
            data_lead = r_lead.json()
            if not data_lead.get("_embedded", {}).get("leads"):
                logger.error("amoCRM: no lead in response", extra={"response": data_lead})
                return None
            lead_id = data_lead["_embedded"]["leads"][0]["id"]
            return lead_id
    except httpx.HTTPStatusError as e:
        logger.error("amoCRM HTTP error", extra={"status": e.response.status_code, "body": e.response.text}, exc_info=True)
        return None
    except Exception as e:
        logger.error("amoCRM error", extra={"error": str(e)}, exc_info=True)
        return None
