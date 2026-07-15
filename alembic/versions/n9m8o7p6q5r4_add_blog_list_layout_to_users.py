"""add blog_list_layout to users

Revision ID: n9m8o7p6q5r4
Revises: c2d3e4f5a6b7
Create Date: 2026-07-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "n9m8o7p6q5r4"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("blog_list_layout", sa.String(16), nullable=False, server_default="list"))


def downgrade() -> None:
    op.drop_column("users", "blog_list_layout")
