"""add phase3 blog seo and config columns

Revision ID: s5t6u7v8w9x0
Revises: r4s5t6u7v8w9
Create Date: 2026-09-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "s5t6u7v8w9x0"
down_revision: Union[str, Sequence[str], None] = "r4s5t6u7v8w9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("blogs", sa.Column("og_image_url", sa.String(), nullable=True))
    op.add_column("blogs", sa.Column("canonical_url", sa.String(), nullable=True))
    op.add_column("blogs", sa.Column("noindex", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("blogs", sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("blogs", sa.Column("custom_schema", sa.JSON(), nullable=True))
    op.add_column("blogs", sa.Column("faq_items", sa.JSON(), nullable=True, server_default=sa.text("'[]'::json")))
    op.create_index("ix_blogs_site_is_pinned", "blogs", ["site_id", "is_pinned"])


def downgrade() -> None:
    op.drop_index("ix_blogs_site_is_pinned", table_name="blogs")
    op.drop_column("blogs", "faq_items")
    op.drop_column("blogs", "custom_schema")
    op.drop_column("blogs", "is_pinned")
    op.drop_column("blogs", "noindex")
    op.drop_column("blogs", "canonical_url")
    op.drop_column("blogs", "og_image_url")
