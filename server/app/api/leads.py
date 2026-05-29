from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user_id
from app.models import Lead
from app.schemas.leads import LeadOut, LeadDetailOut, LeadUpdate

router = APIRouter()


@router.get("/leads", response_model=list[LeadOut])
def list_leads(
    db: Session = Depends(get_db),
    _: int = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    type_filter: str | None = Query(None, alias="type"),
    status: str | None = Query(None, description="Фильтр по статусу заявки"),
    archived: bool = Query(False, description="true — только архив, false — только активные"),
    created_after: datetime | None = Query(
        None,
        description="ISO 8601, заявки с created_at >= этого момента (UTC)",
    ),
    created_before: datetime | None = Query(
        None,
        description="ISO 8601, заявки с created_at <= этого момента (UTC)",
    ),
):
    q = db.query(Lead).order_by(Lead.created_at.desc())
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
    leads = q.offset(offset).limit(limit).all()
    return leads


@router.get("/leads/{lead_id}", response_model=LeadDetailOut)
def get_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_user_id),
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
    _: int = Depends(get_current_user_id),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if body.status is not None:
        lead.status = body.status

    if body.archived is not None:
        if body.archived:
            lead.archived_at = datetime.utcnow()
        else:
            lead.archived_at = None

    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead
