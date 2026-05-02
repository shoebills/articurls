"""add featured_blogs to users

Revision ID: c4d5e6f7g8h9
Revises: b2c3d4e5f6a7
Create Date: 2026-04-26 02:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7g8h9"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("featured_blogs_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("featured_blog_ids", sa.JSON(), nullable=True),
    )
    op.alter_column("users", "featured_blogs_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "featured_blog_ids")
    op.drop_column("users", "featured_blogs_enabled")
