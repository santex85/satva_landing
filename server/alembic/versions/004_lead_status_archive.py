"""Add lead status and archive fields

Revision ID: 004
Revises: 003
Create Date: 2026-05-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "leads",
        sa.Column("status", sa.String(length=32), server_default="new", nullable=False),
    )
    op.add_column(
        "leads",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "leads",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_leads_status"), "leads", ["status"], unique=False)
    op.create_index(op.f("ix_leads_archived_at"), "leads", ["archived_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_leads_archived_at"), table_name="leads")
    op.drop_index(op.f("ix_leads_status"), table_name="leads")
    op.drop_column("leads", "updated_at")
    op.drop_column("leads", "archived_at")
    op.drop_column("leads", "status")
