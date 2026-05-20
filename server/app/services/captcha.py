"""Cloudflare Turnstile server-side verification."""

import logging
from typing import Any

import httpx
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def _host_is_localhost(request: Request) -> bool:
    """Host с браузера при открытии http://localhost / 127.0.0.1 (Docker compose dev)."""
    raw = (request.headers.get("host") or "").strip()
    if not raw:
        return False
    if raw.startswith("["):
        end = raw.find("]")
        host = (raw[1:end] if end != -1 else "").lower()
    else:
        host, _, _ = raw.partition(":")
        host = host.lower()
    if host in ("localhost", "127.0.0.1", "::1"):
        return True
    if host.endswith(".localhost"):
        return True
    return False


def verify_turnstile_or_skip(request: Request, captcha_token: str | None) -> None:
    """
    На localhost (Host header) — не проверяем Turnstile.
    Если TURNSTILE_SECRET_KEY пустой и DEBUG — пропуск.
    Если секрета нет и не DEBUG — 503.
    Иначе — проверка токена у Cloudflare.
    """
    if _host_is_localhost(request):
        return

    secret = (settings.TURNSTILE_SECRET_KEY or "").strip()
    site_key = (settings.TURNSTILE_SITE_KEY or "").strip()
    if not secret:
        if settings.DEBUG or not site_key:
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
