"""Drop Instagram handle from leads

Revision ID: 012
Revises: 011
Create Date: 2026-08-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("leads", "social_handle")


def downgrade() -> None:
    op.add_column("leads", sa.Column("social_handle", sa.Text(), nullable=True))
