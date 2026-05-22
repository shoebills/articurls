"""add umami_website_id to users

Revision ID: z8a9b0c1d2e3
Revises: y7z8a9b0c1d2
Create Date: 2026-05-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "z8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = "y7z8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("umami_website_id", sa.String(length=36), nullable=True),
    )
    op.create_index("ix_users_umami_website_id", "users", ["umami_website_id"])


def downgrade() -> None:
    op.drop_index("ix_users_umami_website_id", table_name="users")
    op.drop_column("users", "umami_website_id")
