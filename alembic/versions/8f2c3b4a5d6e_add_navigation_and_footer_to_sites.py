"""add navigation and footer to sites

Revision ID: 8f2c3b4a5d6e
Revises: 4c1a1682936c
Create Date: 2026-08-20 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f2c3b4a5d6e'
down_revision: Union[str, Sequence[str], None] = '4c1a1682936c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sites', sa.Column('nav_items', sa.JSON(), nullable=True))
    op.add_column('sites', sa.Column('footer_columns', sa.JSON(), nullable=True))
    op.add_column('sites', sa.Column('footer_copyright', sa.String(), nullable=True))
    op.add_column('sites', sa.Column('footer_socials_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('sites', sa.Column('footer_newsletter_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('sites', sa.Column('footer_system_links_enabled', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('sites', 'footer_system_links_enabled')
    op.drop_column('sites', 'footer_newsletter_enabled')
    op.drop_column('sites', 'footer_socials_enabled')
    op.drop_column('sites', 'footer_copyright')
    op.drop_column('sites', 'footer_columns')
    op.drop_column('sites', 'nav_items')
