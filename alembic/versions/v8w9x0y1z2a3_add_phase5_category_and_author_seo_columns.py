"""add phase5 category and author seo columns

Revision ID: v8w9x0y1z2a3
Revises: t6u7v8w9x0y1
Create Date: 2026-09-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "v8w9x0y1z2a3"
down_revision: Union[str, Sequence[str], None] = "t6u7v8w9x0y1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("meta_title", sa.String(), nullable=True))
    op.add_column("categories", sa.Column("meta_description", sa.Text(), nullable=True))
    op.add_column("authors", sa.Column("meta_title", sa.String(), nullable=True))
    op.add_column("authors", sa.Column("meta_description", sa.Text(), nullable=True))
    op.add_column("authors", sa.Column("noindex", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("authors", "noindex")
    op.drop_column("authors", "meta_description")
    op.drop_column("authors", "meta_title")
    op.drop_column("categories", "meta_description")
    op.drop_column("categories", "meta_title")