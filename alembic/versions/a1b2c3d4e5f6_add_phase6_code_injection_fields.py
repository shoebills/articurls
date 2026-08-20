"""add phase6 code injection fields

Revision ID: a1b2c3d4e5f6
Revises: 9a1b2c3d4e5f
Create Date: 2026-08-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sites', sa.Column('custom_head_code', sa.Text(), nullable=True))
    op.add_column('sites', sa.Column('custom_body_code', sa.Text(), nullable=True))
    op.add_column('sites', sa.Column('custom_css', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('sites', 'custom_css')
    op.drop_column('sites', 'custom_body_code')
    op.drop_column('sites', 'custom_head_code')
