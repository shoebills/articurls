"""replace blog_list_layout with content_width + list_image_position

Revision ID: a0b1c2d3e4f5
Revises: z8a9b0c1d2e3
Create Date: 2026-07-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = "o8p9q0r1s2t3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("content_width", sa.String(8), nullable=False, server_default="wide"))
    op.add_column("users", sa.Column("list_image_position", sa.String(16), nullable=False, server_default="above_title"))

    # Data migration: map old values to new
    op.execute(
        "UPDATE users SET content_width = 'narrow', list_image_position = 'next_to_title' "
        "WHERE blog_list_layout = 'list'"
    )
    op.execute(
        "UPDATE users SET content_width = 'wide', list_image_position = 'above_title' "
        "WHERE blog_list_layout = 'card_grid'"
    )

    op.drop_column("users", "blog_list_layout")


def downgrade() -> None:
    op.add_column("users", sa.Column("blog_list_layout", sa.String(16), nullable=False, server_default="list"))

    op.execute(
        "UPDATE users SET blog_list_layout = 'list' "
        "WHERE content_width = 'narrow'"
    )
    op.execute(
        "UPDATE users SET blog_list_layout = 'card_grid' "
        "WHERE content_width = 'wide'"
    )

    op.drop_column("users", "content_width")
    op.drop_column("users", "list_image_position")
