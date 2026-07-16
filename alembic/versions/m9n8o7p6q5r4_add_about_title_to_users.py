"""add about_title to users

Revision ID: m9n8o7p6q5r4
Revises: n9m8o7p6q5r4
Create Date: 2026-07-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "m9n8o7p6q5r4"
down_revision: Union[str, Sequence[str], None] = "n9m8o7p6q5r4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("about_title", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "about_title")
