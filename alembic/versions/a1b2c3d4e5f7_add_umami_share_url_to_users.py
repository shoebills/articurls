"""add umami_share_url to users

Revision ID: a1b2c3d4e5f7
Revises: z8a9b0c1d2e3
Create Date: 2026-05-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, Sequence[str], None] = "z8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("umami_share_url", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "umami_share_url")
