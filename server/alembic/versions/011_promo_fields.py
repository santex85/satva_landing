"""Add promo fields to leads

Revision ID: 011
Revises: 010
Create Date: 2026-08-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("promo_id", sa.Text(), nullable=True))
    op.add_column(
        "leads",
        sa.Column("promo_optin", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column("leads", sa.Column("social_handle", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "social_handle")
    op.drop_column("leads", "promo_optin")
    op.drop_column("leads", "promo_id")
