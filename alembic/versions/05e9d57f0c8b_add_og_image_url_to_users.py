"""add og_image_url to users

Revision ID: 05e9d57f0c8b
Revises: a0b1c2d3e4f6
Create Date: 2026-07-28 14:51:43.642664

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '05e9d57f0c8b'
down_revision: Union[str, Sequence[str], None] = 'a0b1c2d3e4f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('og_image_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'og_image_url')
