"""add footer enabled to users

Revision ID: 8c1f2d3e4a5b
Revises: 7b9e1c2d3f4a
Create Date: 2026-04-15 01:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c1f2d3e4a5b"
down_revision: Union[str, Sequence[str], None] = "7b9e1c2d3f4a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("footer_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.alter_column("users", "footer_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "footer_enabled")
