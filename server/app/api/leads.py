from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user_id
from app.models import Lead
from app.schemas.leads import LeadOut, LeadDetailOut

router = APIRouter()


@router.get("/leads", response_model=list[LeadOut])
def list_leads(
    db: Session = Depends(get_db),
    _: int = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    type_filter: str | None = Query(None, alias="type"),
):
    q = db.query(Lead).order_by(Lead.created_at.desc())
    if type_filter:
        q = q.filter(Lead.type == type_filter)
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
