"""add favicon_url to users

Revision ID: j6k7l8m9n0o1
Revises: 21097b74d944
Create Date: 2026-05-07

Adds favicon_url column to the users table.
Pro users can upload a custom favicon (max 256KB, 512x512 recommended)
that replaces the platform favicon on their public blog pages.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "j6k7l8m9n0o1"
down_revision: Union[str, Sequence[str], None] = "21097b74d944"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("favicon_url", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "favicon_url")
