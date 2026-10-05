"""rename show_preview_in_lists to show_excerpt on sites

Pure rename; semantics unchanged. The grid/list layout toggle is gone, so
the old name referenced a dead concept. `show_excerpt` describes what the
flag does on any theme: show the post excerpt below the title in feeds.

Revision ID: m6n7o8p9q0r1
Revises: l5m6n7o8p9q0
Create Date: 2026-10-05
"""
from typing import Sequence, Union

from alembic import op


revision: str = "m6n7o8p9q0r1"
down_revision: Union[str, Sequence[str], None] = "l5m6n7o8p9q0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("sites", "show_preview_in_lists", new_column_name="show_excerpt")


def downgrade() -> None:
    op.alter_column("sites", "show_excerpt", new_column_name="show_preview_in_lists")
