"""add phase4 page seo and config columns

Revision ID: t6u7v8w9x0y1
Revises: s5t6u7v8w9x0
Create Date: 2026-09-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "t6u7v8w9x0y1"
down_revision: Union[str, Sequence[str], None] = "s5t6u7v8w9x0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_pages", sa.Column("featured_image_url", sa.String(), nullable=True))
    op.add_column("user_pages", sa.Column("og_image_url", sa.String(), nullable=True))
    op.add_column("user_pages", sa.Column("canonical_url", sa.String(), nullable=True))
    op.add_column("user_pages", sa.Column("noindex", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("user_pages", sa.Column("custom_schema", sa.JSON(), nullable=True))
    op.add_column("user_pages", sa.Column("faq_items", sa.JSON(), nullable=True, server_default=sa.text("'[]'::json")))


def downgrade() -> None:
    op.drop_column("user_pages", "faq_items")
    op.drop_column("user_pages", "custom_schema")
    op.drop_column("user_pages", "noindex")
    op.drop_column("user_pages", "canonical_url")
    op.drop_column("user_pages", "og_image_url")
    op.drop_column("user_pages", "featured_image_url")