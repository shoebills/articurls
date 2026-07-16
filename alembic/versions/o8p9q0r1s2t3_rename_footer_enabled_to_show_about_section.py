"""rename footer_enabled to show_about_section

Revision ID: o8p9q0r1s2t3
Revises: m9n8o7p6q5r4
Create Date: 2026-07-15 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "o8p9q0r1s2t3"
down_revision: Union[str, Sequence[str], None] = "m9n8o7p6q5r4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "footer_enabled", new_column_name="show_about_section")


def downgrade() -> None:
    op.alter_column("users", "show_about_section", new_column_name="footer_enabled")
