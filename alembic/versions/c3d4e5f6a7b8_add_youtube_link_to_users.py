"""add youtube_link to users

Revision ID: c3d4e5f6a7b8
Revises: 9f2c6d1a4b7e
Create Date: 2026-04-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "9f2c6d1a4b7e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("youtube_link", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "youtube_link")
