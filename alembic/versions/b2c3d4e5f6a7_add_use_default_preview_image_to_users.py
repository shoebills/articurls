"""add use_default_preview_image to users

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-25 22:02:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("use_default_preview_image", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.alter_column("users", "use_default_preview_image", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "use_default_preview_image")
