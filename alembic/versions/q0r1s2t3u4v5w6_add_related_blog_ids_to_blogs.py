"""add related_blog_ids to blogs

Revision ID: q0r1s2t3u4v5w6
Revises: p9q0r1s2t3u4
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "q0r1s2t3u4v5w6"
down_revision: Union[str, Sequence[str], None] = "p9q0r1s2t3u4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("blogs", sa.Column("related_blog_ids", sa.JSON(), nullable=True, server_default=sa.text("'[]'::json")))


def downgrade() -> None:
    op.drop_column("blogs", "related_blog_ids")
