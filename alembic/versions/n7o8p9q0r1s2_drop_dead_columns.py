"""drop footer_order from user_pages and search_console_property from sites

footer_order was write-never dead: no API or dashboard UI ever set it, so
footer pages always fell back to created_at ordering. search_console_property
was write-only storage with zero consumers — Search Console verification
renders from the token alone.

Revision ID: n7o8p9q0r1s2
Revises: m6n7o8p9q0r1
Create Date: 2026-10-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "n7o8p9q0r1s2"
down_revision: Union[str, Sequence[str], None] = "m6n7o8p9q0r1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("user_pages", "footer_order")
    op.drop_column("sites", "search_console_property")


def downgrade() -> None:
    op.add_column(
        "user_pages",
        sa.Column("footer_order", sa.Integer(), nullable=True),
    )
    op.add_column(
        "sites",
        sa.Column("search_console_property", sa.Text(), nullable=True),
    )
