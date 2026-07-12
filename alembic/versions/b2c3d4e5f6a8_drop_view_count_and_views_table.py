"""drop view_count from blogs and views table

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-05-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop denormalized view count column — no longer tracked
    op.drop_column("blogs", "view_count")

    # Drop legacy views table — replaced by Umami analytics
    op.drop_table("views")


def downgrade() -> None:
    op.create_table(
        "views",
        sa.Column("view_id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("blog_id", sa.Integer(), sa.ForeignKey("blogs.blog_id"), nullable=False),
        sa.Column("visitor_hash", sa.String(), nullable=False),
        sa.Column("visited_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.add_column(
        "blogs",
        sa.Column("view_count", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
    )
    op.alter_column("blogs", "view_count", server_default=None)
