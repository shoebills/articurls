"""drop seo robots and sitemap toggles from users

Revision ID: w4x5y6z7a8b9
Revises: v3w4x5y6z7a8
Create Date: 2026-05-16 18:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "w4x5y6z7a8b9"
down_revision: Union[str, Sequence[str], None] = "v3w4x5y6z7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "sitemap_enabled")
    op.drop_column("users", "robots_custom_rules")
    op.drop_column("users", "robots_mode")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("robots_mode", sa.String(), nullable=False, server_default="auto"),
    )
    op.add_column("users", sa.Column("robots_custom_rules", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column("sitemap_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.alter_column("users", "robots_mode", server_default=None)
    op.alter_column("users", "sitemap_enabled", server_default=None)
