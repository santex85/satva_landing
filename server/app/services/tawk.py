"""Tawk.to: E.164 phone + HMAC hash for widget login()."""

import hashlib
import hmac
import re

from app.config import settings
from app.schemas.contact import ContactResponse, TawkLoginPayload


def normalize_phone_e164(phone: str | None) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", str(phone).strip())
    if len(digits) < 10 or len(digits) > 15:
        return ""
    return f"+{digits}"


def tawk_login_hash(user_id: str) -> str:
    key = (settings.TAWK_JS_API_KEY or "").strip().encode("utf-8")
    return hmac.new(key, user_id.encode("utf-8"), hashlib.sha256).hexdigest()


def build_tawk_login_payload(
    name: str | None,
    email: str | None,
    phone: str | None,
) -> TawkLoginPayload | None:
    api_key = (settings.TAWK_JS_API_KEY or "").strip()
    if not api_key:
        return None

    e164 = normalize_phone_e164(phone)
    if not e164:
        return None

    user_id = e164
    return TawkLoginPayload(
        userId=user_id,
        hash=tawk_login_hash(user_id),
        name=(name or "").strip() or None,
        email=(email or "").strip() or None,
        phone=e164,
    )


def contact_response_with_tawk(
    name: str | None,
    email: str | None,
    phone: str | None,
) -> ContactResponse:
    return ContactResponse(tawk_login=build_tawk_login_payload(name, email, phone))
