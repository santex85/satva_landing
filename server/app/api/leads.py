from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import Lead, AdminUser
from app.schemas.leads import LeadOut, LeadDetailOut, LeadUpdate
from app.services.audit import log_audit
from app.services.leads_query import apply_lead_filters, count_leads, get_lead_stats, leads_to_csv

router = APIRouter()


def _build_filters(
    type_filter: str | None,
    status: str | None,
    archived: bool,
    created_after: datetime | None,
    created_before: datetime | None,
    q_text: str | None,
) -> dict:
    return {
        "type_filter": type_filter,
        "status": status,
        "archived": archived,
        "created_after": created_after,
        "created_before": created_before,
        "q_text": q_text,
    }


@router.get("/leads/stats")
def lead_stats(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
    type_filter: str | None = Query(None, alias="type"),
    archived: bool = Query(False, description="true — только архив, false — только активные"),
    q: str | None = Query(None, description="Поиск по имени/телефону/email"),
    created_after: datetime | None = Query(None),
    created_before: datetime | None = Query(None),
):
    filters = _build_filters(type_filter, None, archived, created_after, created_before, q)
    filters.pop("status", None)
    return get_lead_stats(db, **filters)


@router.get("/leads", response_model=list[LeadOut])
def list_leads(
    response: Response,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    type_filter: str | None = Query(None, alias="type"),
    status: str | None = Query(None, description="Фильтр по статусу заявки"),
    archived: bool = Query(False, description="true — только архив, false — только активные"),
    q: str | None = Query(None, description="Поиск по имени/телефону/email"),
    created_after: datetime | None = Query(None),
    created_before: datetime | None = Query(None),
):
    filters = _build_filters(type_filter, status, archived, created_after, created_before, q)
    total = count_leads(db, **filters)
    response.headers["X-Total-Count"] = str(total)

    qry = db.query(Lead).order_by(Lead.created_at.desc())
    qry = apply_lead_filters(qry, **filters)
    leads = qry.offset(offset).limit(limit).all()
    return leads


@router.get("/leads/export")
def export_leads(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
    type_filter: str | None = Query(None, alias="type"),
    status: str | None = Query(None),
    archived: bool = Query(False),
    q: str | None = Query(None),
    created_after: datetime | None = Query(None),
    created_before: datetime | None = Query(None),
):
    filters = _build_filters(type_filter, status, archived, created_after, created_before, q)
    qry = db.query(Lead).order_by(Lead.created_at.desc())
    qry = apply_lead_filters(qry, **filters)
    leads = qry.limit(10000).all()
    csv_data = leads_to_csv(leads)
    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )


@router.get("/leads/{lead_id}", response_model=LeadDetailOut)
def get_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: UUID,
    body: LeadUpdate,
    db: Session = Depends(get_db),
    user: AdminUser = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = datetime.now(timezone.utc)

    if body.status is not None and body.status != lead.status:
        old_status = lead.status
        lead.status = body.status
        log_audit(
            db,
            actor=user,
            action="lead.status_change",
            target_type="lead",
            target_id=str(lead.id),
            meta={"from": old_status, "to": body.status},
        )

    if body.archived is not None:
        if body.archived:
            if lead.archived_at is None:
                lead.archived_at = now
                log_audit(
                    db,
                    actor=user,
                    action="lead.archive",
                    target_type="lead",
                    target_id=str(lead.id),
                )
        else:
            if lead.archived_at is not None:
                lead.archived_at = None
                log_audit(
                    db,
                    actor=user,
                    action="lead.restore",
                    target_type="lead",
                    target_id=str(lead.id),
                )

    lead.updated_at = now
    db.commit()
    db.refresh(lead)
    return lead
