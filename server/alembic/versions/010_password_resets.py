"""Admin password reset tokens

Revision ID: 010
Revises: 009
Create Date: 2026-06-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_password_resets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["admin_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_password_resets_user_id"), "admin_password_resets", ["user_id"], unique=False)
    op.create_index(op.f("ix_admin_password_resets_token_hash"), "admin_password_resets", ["token_hash"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_password_resets_token_hash"), table_name="admin_password_resets")
    op.drop_index(op.f("ix_admin_password_resets_user_id"), table_name="admin_password_resets")
    op.drop_table("admin_password_resets")
