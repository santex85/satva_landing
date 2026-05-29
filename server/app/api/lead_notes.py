from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Lead, LeadNote, AdminUser, AdminRole
from app.schemas.notes import LeadNoteOut, LeadNoteCreate, LeadNoteUpdate

router = APIRouter()


def _get_lead_or_404(db: Session, lead_id: UUID) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def _can_edit_note(user: AdminUser, note: LeadNote) -> bool:
    return user.role == AdminRole.OWNER or note.author_id == user.id


@router.get("/leads/{lead_id}/notes", response_model=list[LeadNoteOut])
def list_notes(
    lead_id: UUID,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_user),
):
    _get_lead_or_404(db, lead_id)
    notes = (
        db.query(LeadNote)
        .options(joinedload(LeadNote.author))
        .filter(LeadNote.lead_id == lead_id)
        .order_by(LeadNote.created_at.desc())
        .all()
    )
    return notes


@router.post("/leads/{lead_id}/notes", response_model=LeadNoteOut)
def create_note(
    lead_id: UUID,
    body: LeadNoteCreate,
    db: Session = Depends(get_db),
    user: AdminUser = Depends(get_current_user),
):
    _get_lead_or_404(db, lead_id)
    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст заметки не может быть пустым")
    note = LeadNote(
        lead_id=lead_id,
        author_id=user.id,
        body=text,
        created_at=datetime.now(timezone.utc),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    note = (
        db.query(LeadNote)
        .options(joinedload(LeadNote.author))
        .filter(LeadNote.id == note.id)
        .first()
    )
    return note


@router.patch("/leads/{lead_id}/notes/{note_id}", response_model=LeadNoteOut)
def update_note(
    lead_id: UUID,
    note_id: int,
    body: LeadNoteUpdate,
    db: Session = Depends(get_db),
    user: AdminUser = Depends(get_current_user),
):
    _get_lead_or_404(db, lead_id)
    note = (
        db.query(LeadNote)
        .options(joinedload(LeadNote.author))
        .filter(LeadNote.id == note_id, LeadNote.lead_id == lead_id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if not _can_edit_note(user, note):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст заметки не может быть пустым")
    note.body = text
    note.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/leads/{lead_id}/notes/{note_id}")
def delete_note(
    lead_id: UUID,
    note_id: int,
    db: Session = Depends(get_db),
    user: AdminUser = Depends(get_current_user),
):
    _get_lead_or_404(db, lead_id)
    note = db.query(LeadNote).filter(LeadNote.id == note_id, LeadNote.lead_id == lead_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if not _can_edit_note(user, note):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    db.delete(note)
    db.commit()
    return {"ok": True}
