"""drop username_change_count column and username_change_requests table

Revision ID: t0v1w2x3y4z5
Revises: s6t7u8v9w0x1
Create Date: 2026-06-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "t0v1w2x3y4z5"
down_revision: Union[str, Sequence[str], None] = "s6t7u8v9w0x1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("username_change_requests")
    op.drop_column("users", "username_change_count")


def downgrade() -> None:
    op.add_column("users", sa.Column("username_change_count", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.create_table(
        "username_change_requests",
        sa.Column("request_id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False, index=True),
        sa.Column("desired_username", sa.String(), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("admin_note", sa.String(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=True, index=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
