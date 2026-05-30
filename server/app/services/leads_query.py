import csv
import io
from datetime import datetime, timezone

from sqlalchemy import or_, func
from sqlalchemy.orm import Query, Session

from app.models import Lead

WEB_FORM_SOURCES = frozenset({"landing", "popup", "footer", "yoga-bridge"})


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
    return q


def count_leads(db: Session, **filters) -> int:
    q = db.query(func.count(Lead.id))
    q = apply_lead_filters(q, **filters)
    return int(q.scalar() or 0)


def leads_to_csv(leads: list[Lead]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["created_at", "type", "status", "name", "phone", "email", "source"])
    for lead in leads:
        payload = lead.payload or {}
        writer.writerow([
            lead.created_at.isoformat() if lead.created_at else "",
            lead.type,
            lead.status,
            payload.get("name", ""),
            payload.get("phone", ""),
            payload.get("email", ""),
            lead.source or "",
        ])
    return output.getvalue()


def get_lead_stats(
    db: Session,
    *,
    archived: bool = False,
    type_filter: str | None = None,
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    q_text: str | None = None,
) -> dict:
    base_filters = {
        "archived": archived,
        "type_filter": type_filter,
        "created_after": created_after,
        "created_before": created_before,
        "q_text": q_text,
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
