"""Определение языка/канала сайта для заявки (RU/EN)."""

import re

_SITE_ROOT_EN = re.compile(r"satvasamui\.(com|site)/?($|[?#])", re.I)


def infer_lang_from_referer(referer: str | None) -> str:
    """Эвристика для старых заявок без payload.lang (по Referer формы)."""
    if not referer or not str(referer).strip():
        return "ru"
    r = str(referer).strip().lower()
    if "/ru/" in r or r.rstrip("/").endswith("/ru"):
        return "ru"
    if _SITE_ROOT_EN.search(r) or "www.satvasamui.com" in r:
        return "en"
    return "ru"


def effective_lang(payload: dict | None, referer: str | None = None) -> str:
    lang = ((payload or {}).get("lang") or "").strip().lower()
    if lang in ("en", "ru"):
        return lang
    return infer_lang_from_referer(referer)
