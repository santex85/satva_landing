import csv
import io
from datetime import datetime, timezone

from sqlalchemy import or_, func
from sqlalchemy.orm import Query, Session

from app.models import Lead


def apply_lead_filters(
    q: Query,
    *,
    type_filter: str | None = None,
    status: str | None = None,
    archived: bool = False,
    created_after: datetime | None = None,
    created_before: datetime | None = None,
    q_text: str | None = None,
) -> Query:
    if type_filter:
        q = q.filter(Lead.type == type_filter)
    if status:
        q = q.filter(Lead.status == status)
    if archived:
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
