"""rename list_image_position to content_layout grid/list

Revision ID: d7e8f9g0h1i2
Revises: c6d7e8f9g0h1
Create Date: 2026-09-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7e8f9g0h1i2"
down_revision: Union[str, Sequence[str], None] = "c6d7e8f9g0h1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("sites", "list_image_position", new_column_name="content_layout", existing_type=sa.String(length=16), existing_nullable=False)
    op.execute("UPDATE sites SET content_layout = 'grid' WHERE content_layout = 'above_title'")
    op.execute("UPDATE sites SET content_layout = 'list' WHERE content_layout = 'next_to_title'")
    op.alter_column("sites", "content_layout", server_default="grid")


def downgrade() -> None:
    op.execute("UPDATE sites SET content_layout = 'above_title' WHERE content_layout = 'grid'")
    op.execute("UPDATE sites SET content_layout = 'next_to_title' WHERE content_layout = 'list'")
    op.alter_column("sites", "content_layout", new_column_name="list_image_position", existing_type=sa.String(length=16), existing_nullable=False, server_default="above_title")
