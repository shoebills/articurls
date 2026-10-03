"""drop featured_blogs_enabled from sites

Removes featured_blogs_enabled from sites table. Featured posts visibility
is driven directly by whether featured_blog_ids contains at least one
published post, making this unwritable site-level boolean redundant.

Revision ID: i2j3k4l5m6n7
Revises: h1i2j3k4l5m6
Create Date: 2026-10-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i2j3k4l5m6n7"
down_revision: Union[str, Sequence[str], None] = "h1i2j3k4l5m6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("sites", "featured_blogs_enabled")


def downgrade() -> None:
    op.add_column(
        "sites",
        sa.Column("featured_blogs_enabled", sa.Boolean(), nullable=False, server_default="true"),
    )
