"""replace hide_preview_in_lists with global show_preview_in_lists

Revision ID: 402e5d857779
Revises: a0b1c2d3e4f5
Create Date: 2026-07-20 17:07:45.401595

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '402e5d857779'
down_revision: Union[str, Sequence[str], None] = 'a0b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('blogs', 'hide_preview_in_lists')
    op.add_column('users', sa.Column('show_preview_in_lists', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'show_preview_in_lists')
    op.add_column('blogs', sa.Column('hide_preview_in_lists', sa.BOOLEAN(), server_default=sa.text('false'), autoincrement=False, nullable=False))
