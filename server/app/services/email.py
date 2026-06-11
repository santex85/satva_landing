import logging
from datetime import date, datetime
from html import escape

import resend
from sqlalchemy.orm import Session

from app.config import settings
from app.services.app_settings import get_lead_notification_emails

logger = logging.getLogger(__name__)

SITE_BASE_URL = "https://satvasamui.com"
LOGO_URL = f"{SITE_BASE_URL}/img/satva-logo.png"
WHATSAPP_URL = "https://wa.me/66950165058"
WHATSAPP_DISPLAY = "+66 950 165 058"
TELEGRAM_URL = "https://t.me/OlgaSatva"
TELEGRAM_DISPLAY = "@OlgaSatva"

_SKIP_KEYS = frozenset({"website", "consent", "captcha_token", "meta_event_id"})

_FIELD_LABELS: dict[str, str] = {
    "lang": "Сайт",
    "name": "Имя",
    "phone": "Телефон",
    "email": "Email",
    "procedure": "Программа",
    "package_slug": "Пакет",
    "preferred_date": "Дата заезда",
    "departure_date": "Дата выезда",
    "guest_count": "Количество человек",
    "comment": "Комментарий",
    "source": "Источник формы",
    "utm_source": "UTM source",
    "utm_medium": "UTM medium",
    "utm_campaign": "UTM campaign",
    "utm_content": "UTM content",
    "utm_term": "UTM term",
    "fbclid": "Facebook click ID",
}

_FIELD_ORDER = (
    "lang",
    "name",
    "phone",
    "email",
    "procedure",
    "package_slug",
    "preferred_date",
    "departure_date",
    "guest_count",
    "comment",
    "source",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
)

_LEAD_TYPE_LABELS: dict[str, str] = {
    "contact": "Контактная заявка",
    "procedure_booking": "Заявка на бронирование",
    "package_choice": "Выбор пакета",
}

_SOURCE_LABELS: dict[str, str] = {
    "landing": "форма на странице (landing)",
    "popup": "модальное окно (popup)",
    "footer": "подвал сайта (footer)",
    "yoga-bridge": "блок-мост (yoga-bridge)",
    "partner-landing": "партнёрский лендинг (форма на странице)",
    "partner-popup": "партнёрский лендинг (модальное окно)",
}

_LANG_LABELS: dict[str, str] = {
    "en": "Английский сайт (EN)",
    "ru": "Русский сайт (RU)",
}

_PACKAGE_LABELS: dict[str, str] = {
    "yoga": "Йога-тур",
    "detox": "Детокс",
    "panchakarma": "Панчакарма",
}

_PACKAGE_LABELS_EN: dict[str, str] = {
    "yoga": "Yoga retreat",
    "detox": "Detox",
    "panchakarma": "Panchakarma",
}

_CONFIRMATION_FIELD_ORDER = (
    "procedure",
    "package_slug",
    "preferred_date",
    "departure_date",
    "guest_count",
    "comment",
    "phone",
)

_CONFIRMATION_FIELD_LABELS: dict[str, dict[str, str]] = {
    "ru": {
        "procedure": "Программа",
        "package_slug": "Пакет",
        "preferred_date": "Дата заезда",
        "departure_date": "Дата выезда",
        "guest_count": "Количество человек",
        "comment": "Комментарий",
        "phone": "Телефон",
    },
    "en": {
        "procedure": "Programme",
        "package_slug": "Package",
        "preferred_date": "Check-in date",
        "departure_date": "Check-out date",
        "guest_count": "Number of guests",
        "comment": "Comment",
        "phone": "Phone",
    },
}

_CONFIRMATION_COPY: dict[str, dict[str, str]] = {
    "ru": {
        "subject": "Спасибо за заявку — Satva Samui",
        "greeting": "Здравствуйте, {name}!",
        "thanks": (
            "Спасибо за проявленный интерес к Satva Samui — "
            "йога-отелю на острове Самуи."
        ),
        "summary_title": "Мы получили вашу заявку:",
        "manager": (
            "Наш менеджер свяжется с вами в течение 24 часов "
            "по указанному телефону или в мессенджере (рабочее время, UTC+7)."
        ),
        "contacts_title": "Если у вас срочный вопрос, напишите нам напрямую:",
        "whatsapp": "WhatsApp",
        "telegram": "Telegram",
        "website": "Сайт",
        "signature": "С уважением,\nкоманда Satva Samui",
        "footer": (
            "Это автоматическое подтверждение получения заявки, "
            "не является подтверждением бронирования."
        ),
        "privacy": "Политика конфиденциальности",
        "site_path": "/ru/",
    },
    "en": {
        "subject": "Thank you for your enquiry — Satva Samui",
        "greeting": "Hello, {name}!",
        "thanks": (
            "Thank you for your interest in Satva Samui — "
            "our yoga retreat on Koh Samui."
        ),
        "summary_title": "We have received your enquiry:",
        "manager": (
            "Our manager will contact you within 24 hours using the phone number "
            "or messenger you provided (business hours, UTC+7)."
        ),
        "contacts_title": "If you have an urgent question, you can reach us directly:",
        "whatsapp": "WhatsApp",
        "telegram": "Telegram",
        "website": "Website",
        "signature": "Best regards,\nthe Satva Samui team",
        "footer": (
            "This is an automatic acknowledgement of your enquiry. "
            "It is not a booking confirmation."
        ),
        "privacy": "Privacy Policy",
        "site_path": "/",
    },
}


def _recipients() -> list[str]:
    raw = (settings.RESEND_TO or "").strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def _is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _format_date(value: str) -> str:
    text = value.strip()
    try:
        parsed = date.fromisoformat(text)
        return parsed.strftime("%d.%m.%Y")
    except ValueError:
        return text


def _format_value(key: str, value) -> str | None:
    if _is_empty(value):
        return None

    if key == "source":
        text = str(value).strip()
        label = _SOURCE_LABELS.get(text, text)
        return label

    if key == "lang":
        text = str(value).strip().lower()
        return _LANG_LABELS.get(text, text)

    if key == "package_slug":
        text = str(value).strip()
        return _PACKAGE_LABELS.get(text, text)

    if key in ("preferred_date", "departure_date"):
        return _format_date(str(value))

    return str(value).strip()


def _lead_type_label(lead_type: str) -> str:
    return _LEAD_TYPE_LABELS.get(lead_type, lead_type)


def _site_tag(payload: dict) -> str:
    lang = (payload.get("lang") or "").strip().lower()
    if lang == "en":
        return "EN"
    if lang == "ru":
        return "RU"
    return ""


def _confirmation_lang(payload: dict) -> str:
    lang = (payload.get("lang") or "ru").strip().lower()
    return lang if lang in ("en", "ru") else "ru"


def _format_guest_value(key: str, value, lang: str) -> str | None:
    if _is_empty(value):
        return None

    if key == "package_slug":
        text = str(value).strip()
        labels = _PACKAGE_LABELS_EN if lang == "en" else _PACKAGE_LABELS
        return labels.get(text, text)

    if key in ("preferred_date", "departure_date"):
        return _format_date(str(value))

    return str(value).strip()


def _confirmation_summary_lines(payload: dict, lang: str) -> list[tuple[str, str]]:
    labels = _CONFIRMATION_FIELD_LABELS[lang]
    rows: list[tuple[str, str]] = []
    for key in _CONFIRMATION_FIELD_ORDER:
        if key not in payload:
            continue
        formatted = _format_guest_value(key, payload[key], lang)
        if formatted is None:
            continue
        rows.append((labels[key], formatted))
    return rows


def _build_confirmation_text(payload: dict, lang: str) -> str:
    copy = _CONFIRMATION_COPY[lang]
    name = (payload.get("name") or "").strip() or ("Guest" if lang == "en" else "Гость")
    lines = [
        copy["greeting"].format(name=name),
        "",
        copy["thanks"],
        "",
        copy["summary_title"],
    ]
    for label, value in _confirmation_summary_lines(payload, lang):
        lines.append(f"• {label}: {value}")
    lines.extend([
        "",
        copy["manager"],
        "",
        copy["contacts_title"],
        f"{copy['whatsapp']}: {WHATSAPP_DISPLAY} ({WHATSAPP_URL})",
        f"{copy['telegram']}: {TELEGRAM_DISPLAY} ({TELEGRAM_URL})",
        f"{copy['website']}: {SITE_BASE_URL}{copy['site_path']}",
        "",
        copy["signature"],
        "",
        "---",
        copy["footer"],
        f"{copy['privacy']}: {SITE_BASE_URL}/privacy.html",
    ])
    return "\n".join(lines) + "\n"


def _build_confirmation_html(payload: dict, lang: str) -> str:
    copy = _CONFIRMATION_COPY[lang]
    name = escape((payload.get("name") or "").strip() or ("Guest" if lang == "en" else "Гость"))
    summary_rows = _confirmation_summary_lines(payload, lang)
    summary_html = ""
    if summary_rows:
        items = "".join(
            f"<li><strong>{escape(label)}:</strong> {escape(value)}</li>"
            for label, value in summary_rows
        )
        summary_html = f"<ul style=\"margin:0 0 16px;padding-left:20px;\">{items}</ul>"
    signature = escape(copy["signature"]).replace("\n", "<br>")
    site_url = f"{SITE_BASE_URL}{copy['site_path']}"
    privacy_url = f"{SITE_BASE_URL}/privacy.html"
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f5f2;font-family:Montserrat,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2D3436;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f5f2;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="padding:24px 28px;background:#0F4C5C;">
          <img src="{LOGO_URL}" alt="Satva Samui" width="180" height="120" style="display:block;max-width:180px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:32px 28px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="font-size:18px;line-height:1.4;color:#0F4C5C;padding-bottom:12px;">
          <strong>{copy['greeting'].format(name=name)}</strong>
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:16px;">
          {escape(copy['thanks'])}
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:8px;">
          <strong>{escape(copy['summary_title'])}</strong>
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:16px;">
          {summary_html}
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:16px;">
          {escape(copy['manager'])}
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:8px;">
          <strong>{escape(copy['contacts_title'])}</strong>
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:16px;">
          <p style="margin:0 0 6px;">{copy['whatsapp']}: <a href="{WHATSAPP_URL}" style="color:#0F4C5C;">{WHATSAPP_DISPLAY}</a></p>
          <p style="margin:0 0 6px;">{copy['telegram']}: <a href="{TELEGRAM_URL}" style="color:#0F4C5C;">{TELEGRAM_DISPLAY}</a></p>
          <p style="margin:0;">{copy['website']}: <a href="{site_url}" style="color:#0F4C5C;">satvasamui.com</a></p>
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:24px;">
          {signature}
        </td></tr>
        <tr><td style="font-size:12px;line-height:1.5;color:#636e72;border-top:1px solid #e8e4df;padding-top:16px;padding-bottom:28px;">
          {escape(copy['footer'])}<br>
          <a href="{privacy_url}" style="color:#0F4C5C;">{escape(copy['privacy'])}</a>
        </td></tr>
        </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_body(lead_type: str, payload: dict, created_at: datetime | None, source: str | None) -> str:
    created = (created_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M UTC")
    merged = dict(payload)
    if source and not _is_empty(source):
        merged.setdefault("source", source)

    lines = [
        f"Тип заявки: {_lead_type_label(lead_type)}",
        f"Дата: {created}",
        "",
        "Данные:",
    ]

    seen: set[str] = set()
    for key in _FIELD_ORDER:
        if key in _SKIP_KEYS or key not in merged:
            continue
        formatted = _format_value(key, merged[key])
        if formatted is None:
            continue
        label = _FIELD_LABELS.get(key, key)
        lines.append(f"  {label}: {formatted}")
        seen.add(key)

    for key, value in merged.items():
        if key in seen or key in _SKIP_KEYS:
            continue
        formatted = _format_value(key, value)
        if formatted is None:
            continue
        label = _FIELD_LABELS.get(key, key)
        lines.append(f"  {label}: {formatted}")

    return "\n".join(lines) + "\n"


def send_lead_notification(
    lead_type: str,
    payload: dict,
    created_at: datetime | None = None,
    source: str | None = None,
    db: Session | None = None,
) -> None:
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        logger.warning("Resend not configured, skipping email")
        return

    recipients = get_lead_notification_emails(db) if db is not None else _recipients()
    if not recipients:
        logger.warning("No lead notification recipients configured, skipping email")
        return

    subject = f"Новая заявка с сайта — {_lead_type_label(lead_type)}"
    site_tag = _site_tag(payload)
    if site_tag:
        subject = f"Новая заявка с сайта ({site_tag}) — {_lead_type_label(lead_type)}"
    body = _build_body(lead_type, payload, created_at, source)

    resend.api_key = settings.RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM,
            "to": recipients,
            "subject": subject,
            "text": body,
        })
        logger.info("Lead notification email sent", extra={"lead_type": lead_type})
    except Exception as e:
        logger.error(
            "Failed to send lead notification email",
            extra={"lead_type": lead_type, "error": str(e)},
            exc_info=True,
        )


def send_tawk_ticket_notification(
    lead_type: str,
    payload: dict,
    created_at: datetime | None = None,
    source: str | None = None,
) -> None:
    """Создаёт тикет в Tawk Inbox через ticket forwarding email (официальный обход без REST API)."""
    forward = (settings.TAWK_TICKET_FORWARD_EMAIL or "").strip()
    if not forward:
        return
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        logger.warning("TAWK_TICKET_FORWARD_EMAIL set but Resend is not configured")
        return

    name = (payload.get("name") or "").strip() or "Гость"
    procedure = (payload.get("procedure") or "").strip()
    phone = (payload.get("phone") or "").strip()
    site_tag = _site_tag(payload)
    subject = f"Заявка с сайта — {name}"
    if site_tag:
        subject = f"Заявка с сайта ({site_tag}) — {name}"
    if phone:
        subject = f"{subject} — {phone}"
    if procedure:
        subject = f"{subject} — {procedure[:120]}"

    body = _build_body(lead_type, payload, created_at, source)
    message: dict = {
        "from": settings.RESEND_FROM,
        "to": [forward],
        "subject": subject,
        "text": body,
    }
    # Не ставим reply_to на email лида: Tawk шлёт автоответ с телом тикета (рус. служебные данные).

    resend.api_key = settings.RESEND_API_KEY
    try:
        result = resend.Emails.send(message)
    except Exception as e:
        logger.error(
            "Failed to send Tawk ticket email",
            extra={"lead_type": lead_type, "error": str(e)},
            exc_info=True,
        )
        return

    resend_id = result.get("id") if isinstance(result, dict) else None
    logger.info(
        "Tawk ticket email sent",
        extra={"lead_type": lead_type, "lead_name": name, "resend_id": resend_id},
    )


def send_lead_confirmation(
    lead_type: str,
    payload: dict,
    created_at: datetime | None = None,
    source: str | None = None,
) -> None:
    """Автоответ лиду после отправки формы (только если указан email)."""
    email = (payload.get("email") or "").strip()
    if not email:
        logger.info("Lead confirmation skipped: no email in payload", extra={"lead_type": lead_type})
        return

    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        logger.warning("Resend not configured, skipping lead confirmation email")
        return

    lang = _confirmation_lang(payload)
    copy = _CONFIRMATION_COPY[lang]
    subject = copy["subject"]
    text = _build_confirmation_text(payload, lang)
    html = _build_confirmation_html(payload, lang)

    resend.api_key = settings.RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM,
            "to": [email],
            "reply_to": settings.RESEND_FROM,
            "subject": subject,
            "text": text,
            "html": html,
        })
        logger.info(
            "Lead confirmation email sent",
            extra={"lead_type": lead_type, "lang": lang, "recipient": email},
        )
    except Exception as e:
        logger.error(
            "Failed to send lead confirmation email",
            extra={"lead_type": lead_type, "lang": lang, "error": str(e)},
            exc_info=True,
        )


def _build_invitation_html(*, invite_url: str, role_label: str, expires_str: str) -> str:
    role_safe = escape(role_label)
    expires_safe = escape(expires_str)
    url_safe = escape(invite_url)
    return f"""<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f5f2;font-family:Montserrat,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2D3436;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f5f2;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="padding:24px 28px;background:#0F4C5C;">
          <img src="{LOGO_URL}" alt="Satva Samui" width="180" height="120" style="display:block;max-width:180px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:32px 28px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="font-size:18px;line-height:1.4;color:#0F4C5C;padding-bottom:12px;">
          <strong>Приглашение в админ-панель</strong>
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:16px;">
          Вас пригласили в админ-панель <strong>Satva Samui</strong> с ролью <strong>{role_safe}</strong>.
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.65;padding-bottom:24px;">
          Нажмите кнопку, чтобы задать пароль и войти в систему:
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="{url_safe}" style="display:inline-block;background:#0F4C5C;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">Принять приглашение</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#636e72;padding-bottom:16px;">
          Если кнопка не работает, скопируйте ссылку в браузер:<br>
          <a href="{url_safe}" style="color:#0F4C5C;word-break:break-all;">{url_safe}</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#636e72;border-top:1px solid #e8e4df;padding-top:16px;padding-bottom:28px;">
          Ссылка действует до <strong>{expires_safe}</strong>.<br>
          Если вы не ожидали это письмо — просто проигнорируйте его.
        </td></tr>
        </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_admin_invitation(*, email: str, role: str, raw_token: str, expires_at: datetime) -> None:
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        logger.warning("Resend not configured, skipping invitation email")
        return

    admin_path = (settings.ADMIN_PATH or "samui-ctl-x7f2").strip().strip("/")
    base = (settings.SITE_BASE_URL or SITE_BASE_URL).rstrip("/")
    invite_url = f"{base}/{admin_path}?invite={raw_token}"
    role_label = "Owner" if role == "owner" else "Manager"
    expires_str = expires_at.strftime("%d.%m.%Y %H:%M UTC")

    subject = "Приглашение в админ-панель Satva Samui"
    text = (
        f"Вас пригласили в админ-панель Satva Samui с ролью {role_label}.\n\n"
        f"Перейдите по ссылке, чтобы задать пароль и войти:\n{invite_url}\n\n"
        f"Ссылка действует до {expires_str}.\n"
        "Если вы не ожидали это письмо — просто проигнорируйте его."
    )
    html = _build_invitation_html(invite_url=invite_url, role_label=role_label, expires_str=expires_str)

    resend.api_key = settings.RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM,
            "to": [email],
            "subject": subject,
            "text": text,
            "html": html,
        })
        logger.info("Admin invitation email sent", extra={"email": email, "role": role})
    except Exception as e:
        logger.error(
            "Failed to send admin invitation email",
            extra={"email": email, "error": str(e)},
            exc_info=True,
        )
