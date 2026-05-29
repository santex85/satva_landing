from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user_id
from app.services.umami import get_analytics_summary

router = APIRouter()


@router.get("/admin/analytics/summary")
def analytics_summary(
    _: int = Depends(get_current_user_id),
    range: str = Query("7d", pattern="^(7d|30d)$"),
):
    return get_analytics_summary(range)
