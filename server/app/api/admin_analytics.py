from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AdminUser
from app.services.leads_query import count_leads, get_leads_by_day
from app.services.umami import get_analytics_summary

router = APIRouter()


def _range_bounds(range_key: str) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    days = 30 if range_key == "30d" else 7
    start = now - timedelta(days=days)
    return start, now


@router.get("/admin/analytics/summary")
def analytics_summary(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
    range: str = Query("7d", pattern="^(7d|30d)$"),
):
    summary = get_analytics_summary(range, db=db)
    start, end = _range_bounds(range)
    leads_count = count_leads(
        db,
        type_filter=None,
        status=None,
        archived=None,
        created_after=start,
        created_before=end,
        q_text=None,
    )
    visits = summary.get("visits") or 0
    conversion = round((leads_count / visits) * 100, 1) if visits else 0.0
    summary["leads_count"] = leads_count
    summary["conversion_rate"] = conversion
    summary["leads_by_day"] = get_leads_by_day(db, start, end)
    return summary
