"""Cloudflare Turnstile server-side verification."""

import logging
from typing import Any

import httpx
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile_or_skip(request: Request, captcha_token: str | None) -> None:
    """
    If TURNSTILE_SECRET_KEY is empty and DEBUG is True — skip.
    If secret is empty and not DEBUG — 503.
    If secret is set — require non-empty token and verify with Cloudflare.
    """
    secret = (settings.TURNSTILE_SECRET_KEY or "").strip()
    if not secret:
        if settings.DEBUG:
            return
        logger.error("TURNSTILE_SECRET_KEY not set in production")
        raise HTTPException(
            status_code=503,
            detail="Проверка капчи не настроена на сервере",
        )

    token = (captcha_token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Пройдите проверку капчи")

    client_host = request.client.host if request.client else None
    forwarded = request.headers.get("x-forwarded-for")
    remote_ip = (forwarded.split(",")[0].strip() if forwarded else None) or client_host

    data: dict[str, Any] = {"secret": secret, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip

    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(TURNSTILE_VERIFY_URL, data=data)
            r.raise_for_status()
            body = r.json()
    except Exception as e:
        logger.error("Turnstile verify request failed", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Не удалось проверить капчу. Попробуйте позже.",
        ) from e

    if not body.get("success"):
        errors = body.get("error-codes") or []
        logger.warning("Turnstile verification failed", extra={"error_codes": errors})
        raise HTTPException(status_code=400, detail="Проверка капчи не пройдена")
