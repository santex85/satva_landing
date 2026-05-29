"""User roles, invitations, token versioning

Revision ID: 005
Revises: 004
Create Date: 2026-05-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE admin_users SET role='owner' WHERE role='admin'")

    op.add_column(
        "admin_users",
        sa.Column("token_version", sa.Integer(), server_default="0", nullable=False),
    )

    op.create_table(
        "admin_invitations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("invited_by", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["invited_by"], ["admin_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_invitations_email"), "admin_invitations", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_invitations_email"), table_name="admin_invitations")
    op.drop_table("admin_invitations")
    op.drop_column("admin_users", "token_version")
    op.execute("UPDATE admin_users SET role='admin' WHERE role='owner'")
