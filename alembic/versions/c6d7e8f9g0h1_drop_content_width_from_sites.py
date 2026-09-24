"""drop content_width from sites

Revision ID: c6d7e8f9g0h1
Revises: b5c6d7e8f9g0
Create Date: 2026-09-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c6d7e8f9g0h1"
down_revision: Union[str, Sequence[str], None] = "b5c6d7e8f9g0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("sites", "content_width")


def downgrade() -> None:
    op.add_column("sites", sa.Column("content_width", sa.String(length=8), nullable=False, server_default="wide"))
