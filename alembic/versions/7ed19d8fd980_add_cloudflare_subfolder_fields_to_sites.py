"""add cloudflare subfolder fields to sites

Revision ID: 7ed19d8fd980
Revises: 13ebded7f99c
Create Date: 2026-08-19 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ed19d8fd980'
down_revision: Union[str, Sequence[str], None] = '13ebded7f99c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sites', sa.Column('cf_zone_id', sa.String(), nullable=True))
    op.add_column('sites', sa.Column('cf_route_id', sa.String(), nullable=True))
    op.add_column('sites', sa.Column('cf_connected', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('sites', 'cf_connected')
    op.drop_column('sites', 'cf_route_id')
    op.drop_column('sites', 'cf_zone_id')
