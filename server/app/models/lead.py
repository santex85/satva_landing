import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class LeadType:
    CONTACT = "contact"
    PROCEDURE_BOOKING = "procedure_booking"
    PACKAGE_CHOICE = "package_choice"


class LeadStatus:
    NEW = "new"
    IN_PROGRESS = "in_progress"
    CONTACTED = "contacted"
    BOOKED = "booked"
    CANCELLED = "cancelled"
    SPAM = "spam"


LEAD_STATUSES = frozenset(
    {
        LeadStatus.NEW,
        LeadStatus.IN_PROGRESS,
        LeadStatus.CONTACTED,
        LeadStatus.BOOKED,
        LeadStatus.CANCELLED,
        LeadStatus.SPAM,
    }
)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default=LeadStatus.NEW)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=datetime.utcnow,
    )

    consents: Mapped[list["Consent"]] = relationship("Consent", back_populates="lead", cascade="all, delete-orphan")
    notes: Mapped[list["LeadNote"]] = relationship("LeadNote", back_populates="lead", cascade="all, delete-orphan")


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    geo_country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    geo_country_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    geo_city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    geo_resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    policy_version: Mapped[str] = mapped_column(String(64), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    referer: Mapped[str | None] = mapped_column(Text, nullable=True)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="consents")
