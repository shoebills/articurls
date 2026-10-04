"""replace numbered pagination with load more

The numbered pagination style is removed in favor of a load-more style.
Existing rows using 'numbered' fall back to the closest behavior, 'prev_next'.

Revision ID: k4l5m6n7o8p9
Revises: j3k4l5m6n7o8
Create Date: 2026-10-04
"""
from typing import Sequence, Union

from alembic import op


revision: str = "k4l5m6n7o8p9"
down_revision: Union[str, Sequence[str], None] = "j3k4l5m6n7o8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE sites SET pagination_type = 'prev_next' WHERE pagination_type = 'numbered'")


def downgrade() -> None:
    op.execute("UPDATE sites SET pagination_type = 'numbered' WHERE pagination_type = 'load_more'")
