"""rename seo columns to meta

Revision ID: d9e0f1a2b3c4
Revises: c6d7e8f9a0b1
Create Date: 2026-04-30 10:30:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "c6d7e8f9a0b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "seo_title", new_column_name="meta_title")
    op.alter_column("users", "seo_description", new_column_name="meta_description")
    op.alter_column("blogs", "seo_title", new_column_name="meta_title")
    op.alter_column("blogs", "seo_description", new_column_name="meta_description")


def downgrade() -> None:
    op.alter_column("blogs", "meta_description", new_column_name="seo_description")
    op.alter_column("blogs", "meta_title", new_column_name="seo_title")
    op.alter_column("users", "meta_description", new_column_name="seo_description")
    op.alter_column("users", "meta_title", new_column_name="seo_title")
