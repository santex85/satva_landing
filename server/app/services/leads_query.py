import csv
import io
from datetime import datetime, timezone

from sqlalchemy import case, literal, or_, func, not_, select
from sqlalchemy.orm import Query, Session

from app.models import Lead, Consent
from app.services.lead_lang import effective_lang

WEB_FORM_SOURCES = frozenset({"landing", "popup", "footer", "yoga-bridge"})

# Каналы лендинга для фильтра в админке (site=ru|en|partner).
SITE_CHANNEL_RU = "ru"
SITE_CHANNEL_EN = "en"
SITE_CHANNEL_PARTNER = "partner"
VALID_SITE_CHANNELS = frozenset({SITE_CHANNEL_RU, SITE_CHANNEL_EN, SITE_CHANNEL_PARTNER})


def _partner_lead_clause():
    """Заявки с сайтов партнёров (префикс source или payload.site)."""
    return or_(
        Lead.source.ilike("partner%"),
        Lead.payload["site"].astext == SITE_CHANNEL_PARTNER,
    )


def _consent_referer_subquery():
    return (
        select(Consent.referer)
        .where(Consent.lead_id == Lead.id)
        .order_by(Consent.id.asc())
        .limit(1)
        .scalar_subquery()
    )


def _effective_lang_expr():
    """payload.lang или эвристика по Referer (старые заявки)."""
    stored = Lead.payload["lang"].astext
    referer = _consent_referer_subquery()
    return case(
        (stored.in_(("en", "ru")), stored),
        (referer.ilike("%/ru/%"), literal("ru")),
        (
            or_(
                referer.op("~*")(r"satvasamui\.(com|site)/?($|[?#])"),
                referer.ilike("%www.satvasamui.com%"),
            ),
            literal("en"),
        ),
        else_=literal("ru"),
    )


def apply_site_channel_filter(q: Query, site_channel: str | None) -> Query:
    if not site_channel or site_channel not in VALID_SITE_CHANNELS:
        return q
    partner = _partner_lead_clause()
    if site_channel == SITE_CHANNEL_PARTNER:
        return q.filter(partner)
    eff = _effective_lang_expr()
    if site_channel == SITE_CHANNEL_EN:
        return q.filter(eff == "en", not_(partner))
    return q.filter(eff == "ru", not_(partner))


def apply_lead_filters(
    q: Query,
    *,
    type_filter: str | None = None,
    status: str | None = None,
    archived: bool | None = False,
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    q_text: str | None = None,
    source_in: frozenset[str] | list[str] | None = None,
    site_channel: str | None = None,
) -> Query:
    if type_filter:
        q = q.filter(Lead.type == type_filter)
    if status:
        q = q.filter(Lead.status == status)
    if archived is None:
        pass
    elif archived:
        q = q.filter(Lead.archived_at.isnot(None))
    else:
        q = q.filter(Lead.archived_at.is_(None))
    if created_after is not None:
        q = q.filter(Lead.created_at >= created_after)
    if created_before is not None:
        q = q.filter(Lead.created_at <= created_before)
    if q_text:
        pattern = f"%{q_text.strip()}%"
        q = q.filter(
            or_(
                Lead.payload["name"].astext.ilike(pattern),
                Lead.payload["phone"].astext.ilike(pattern),
                Lead.payload["email"].astext.ilike(pattern),
            )
        )
    if source_in:
        q = q.filter(Lead.source.in_(list(source_in)))
    q = apply_site_channel_filter(q, site_channel)
    return q


def count_leads(db: Session, **filters) -> int:
    q = db.query(func.count(Lead.id))
    q = apply_lead_filters(q, **filters)
    return int(q.scalar() or 0)


def leads_to_csv(leads: list[Lead]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["created_at", "type", "status", "site", "name", "phone", "email", "source"])
    for lead in leads:
        payload = lead.payload or {}
        writer.writerow([
            lead.created_at.isoformat() if lead.created_at else "",
            lead.type,
            lead.status,
            lead_site_channel_label(lead),
            payload.get("name", ""),
            payload.get("phone", ""),
            payload.get("email", ""),
            lead.source or "",
        ])
    return output.getvalue()


def lead_site_channel_label(lead: Lead, referer: str | None = None) -> str:
    src = (lead.source or "").lower()
    if src.startswith("partner") or (lead.payload or {}).get("site") == SITE_CHANNEL_PARTNER:
        return "partner"
    if not referer and getattr(lead, "consents", None):
        consents = lead.consents or []
        if consents:
            referer = consents[0].referer
    return effective_lang(lead.payload, referer)


def get_lead_stats(
    db: Session,
    *,
    archived: bool = False,
    type_filter: str | None = None,
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    q_text: str | None = None,
    site_channel: str | None = None,
) -> dict:
    base_filters = {
        "archived": archived,
        "type_filter": type_filter,
        "created_after": created_after,
        "created_before": created_before,
        "q_text": q_text,
        "site_channel": site_channel,
    }
    status_rows = (
        apply_lead_filters(db.query(Lead.status, func.count(Lead.id)), **base_filters)
        .group_by(Lead.status)
        .all()
    )
    by_status = {row.status: int(row.count) for row in status_rows}
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = count_leads(
        db,
        archived=archived,
        type_filter=type_filter,
        created_after=today_start,
        created_before=None,
        q_text=q_text,
    )
    total = sum(by_status.values())
    return {
        "by_status": by_status,
        "today": today_count,
        "total": total,
    }


def get_leads_by_day(db: Session, start: datetime, end: datetime) -> list[dict]:
    day = func.date_trunc("day", Lead.created_at)
    rows = (
        db.query(day.label("day"), func.count(Lead.id).label("count"))
        .filter(Lead.created_at >= start, Lead.created_at <= end)
        .group_by(day)
        .order_by(day.asc())
        .all()
    )
    return [{"date": row.day.date().isoformat(), "count": int(row.count)} for row in rows]
