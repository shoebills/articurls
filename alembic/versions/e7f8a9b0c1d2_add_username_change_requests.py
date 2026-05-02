"""add username change requests table

Revision ID: e7f8a9b0c1d2
Revises: d1e2f3a4b5c6
Create Date: 2026-04-25 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "username_change_requests",
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("desired_username", sa.String(), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("admin_note", sa.String(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("request_id"),
    )
    op.create_index("ix_username_change_requests_user_id", "username_change_requests", ["user_id"], unique=False)
    op.create_index(
        "ix_username_change_requests_reviewed_by_user_id",
        "username_change_requests",
        ["reviewed_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_username_change_requests_reviewed_by_user_id", table_name="username_change_requests")
    op.drop_index("ix_username_change_requests_user_id", table_name="username_change_requests")
    op.drop_table("username_change_requests")
