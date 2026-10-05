"""drop content_layout from sites

Removes content_layout from sites table. The Standard theme is grid-only;
the grid/list toggle is gone, so this per-site layout column is dead.
A future list-view theme will reintroduce layout as its own concern.

Revision ID: l5m6n7o8p9q0
Revises: k4l5m6n7o8p9
Create Date: 2026-10-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "l5m6n7o8p9q0"
down_revision: Union[str, Sequence[str], None] = "k4l5m6n7o8p9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("sites", "content_layout")


def downgrade() -> None:
    op.add_column(
        "sites",
        sa.Column("content_layout", sa.String(16), nullable=False, server_default="grid"),
    )
