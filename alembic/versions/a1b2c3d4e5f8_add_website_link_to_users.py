"""add website_link to users

Revision ID: a1b2c3d4e5f8
Revises: 402e5d857779
Create Date: 2026-07-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f8"
down_revision: Union[str, Sequence[str], None] = "402e5d857779"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("website_link", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "website_link")
