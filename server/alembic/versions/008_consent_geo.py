"""Add geo fields to consents

Revision ID: 008
Revises: 007
Create Date: 2026-05-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("consents", sa.Column("geo_country", sa.String(length=128), nullable=True))
    op.add_column("consents", sa.Column("geo_country_code", sa.String(length=2), nullable=True))
    op.add_column("consents", sa.Column("geo_city", sa.String(length=128), nullable=True))
    op.add_column("consents", sa.Column("geo_resolved_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("consents", "geo_resolved_at")
    op.drop_column("consents", "geo_city")
    op.drop_column("consents", "geo_country_code")
    op.drop_column("consents", "geo_country")
