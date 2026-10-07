"""add timezone to sites

Revision ID: a7b8c9d0e1f2
Revises: r1s2t3u4v5w6x7
Create Date: 2026-10-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "r1s2t3u4v5w6x7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sites", sa.Column("timezone", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("sites", "timezone")
