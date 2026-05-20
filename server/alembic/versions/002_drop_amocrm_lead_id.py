"""Drop amocrm_lead_id from leads

Revision ID: 002
Revises: 001
Create Date: 2026-05-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("leads", "amocrm_lead_id")


def downgrade() -> None:
    op.add_column(
        "leads",
        sa.Column("amocrm_lead_id", sa.Integer(), nullable=True),
    )
