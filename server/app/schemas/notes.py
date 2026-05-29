from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class NoteAuthorOut(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True


class LeadNoteOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    updated_at: datetime | None
    author: NoteAuthorOut

    class Config:
        from_attributes = True


class LeadNoteCreate(BaseModel):
    body: str = Field(min_length=1)


class LeadNoteUpdate(BaseModel):
    body: str = Field(min_length=1)
