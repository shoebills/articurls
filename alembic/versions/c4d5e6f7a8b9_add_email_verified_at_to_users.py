"""add email_verified_at and unverified cleanup index to users

Revision ID: c4d5e6f7a8b9
Revises: b9c8d7e6f5a4
Create Date: 2026-10-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "b9c8d7e6f5a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        """
        UPDATE users u
        SET email_verified_at = COALESCE(u.updated_at, u.created_at, now())
        WHERE u.email_verified_at IS NULL
          AND (
            u.email_verified = true
            OR u.google_id IS NOT NULL
            OR u.dodo_customer_id IS NOT NULL
            OR EXISTS (SELECT 1 FROM sites s WHERE s.user_id = u.user_id)
            OR EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.user_id)
            OR EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id)
          )
        """
    )

    op.create_check_constraint(
        "ck_users_email_verified_at_consistency",
        "users",
        "email_verified = false OR email_verified_at IS NOT NULL",
    )
    op.create_index(
        "ix_users_unverified_cleanup",
        "users",
        ["created_at"],
        unique=False,
        postgresql_where=sa.text("email_verified = false AND email_verified_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_users_unverified_cleanup", table_name="users")
    op.drop_constraint(
        "ck_users_email_verified_at_consistency",
        "users",
        type_="check",
    )
    op.drop_column("users", "email_verified_at")
