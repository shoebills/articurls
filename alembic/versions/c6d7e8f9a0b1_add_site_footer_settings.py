"""add site footer settings

Revision ID: c6d7e8f9a0b1
Revises: c4d5e6f7g8h9
Create Date: 2026-04-30 01:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c6d7e8f9a0b1"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7g8h9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("site_footer_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.alter_column("users", "site_footer_enabled", server_default=None)

    op.add_column(
        "user_pages",
        sa.Column("show_in_footer", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("user_pages", sa.Column("footer_order", sa.Integer(), nullable=True))
    op.alter_column("user_pages", "show_in_footer", server_default=None)


def downgrade() -> None:
    op.drop_column("user_pages", "footer_order")
    op.drop_column("user_pages", "show_in_footer")
    op.drop_column("users", "site_footer_enabled")
