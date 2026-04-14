"""add seo robots and sitemap fields

Revision ID: 7b9e1c2d3f4a
Revises: 2d3e4f5a6b7c
Create Date: 2026-04-14 23:55:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7b9e1c2d3f4a"
down_revision: Union[str, Sequence[str], None] = "2d3e4f5a6b7c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("robots_mode", sa.String(), nullable=False, server_default="auto"))
    op.add_column("users", sa.Column("robots_custom_rules", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("sitemap_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.alter_column("users", "robots_mode", server_default=None)
    op.alter_column("users", "sitemap_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "sitemap_enabled")
    op.drop_column("users", "robots_custom_rules")
    op.drop_column("users", "robots_mode")
