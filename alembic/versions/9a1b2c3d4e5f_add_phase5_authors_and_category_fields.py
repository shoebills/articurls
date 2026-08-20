"""add phase5 authors and category fields

Revision ID: 9a1b2c3d4e5f
Revises: 8f2c3b4a5d6e
Create Date: 2026-08-20 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '8f2c3b4a5d6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint('uq_authors_site_slug', 'authors', ['site_id', 'slug'])
    op.add_column('categories', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('categories', 'description')
    op.drop_constraint('uq_authors_site_slug', 'authors', type_='unique')
