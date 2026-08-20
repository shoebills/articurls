"""add design system columns

Revision ID: 4c1a1682936c
Revises: 7ed19d8fd980
Create Date: 2026-08-19 23:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c1a1682936c'
down_revision: Union[str, Sequence[str], None] = '7ed19d8fd980'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename theme_id to template_id
    op.alter_column('sites', 'theme_id', new_column_name='template_id', existing_type=sa.String(32), existing_nullable=False, server_default='editorial')
    
    op.add_column('sites', sa.Column('site_mode', sa.String(length=16), server_default='system', nullable=False))
    op.add_column('sites', sa.Column('color_theme', sa.String(length=32), server_default='base', nullable=False))
    op.add_column('sites', sa.Column('custom_color', sa.String(length=16), nullable=True))
    op.add_column('sites', sa.Column('font_family', sa.String(length=32), server_default='sans', nullable=False))
    op.add_column('sites', sa.Column('button_style', sa.String(length=16), server_default='rounded', nullable=False))
    op.add_column('sites', sa.Column('navbar_alignment', sa.String(length=16), server_default='left', nullable=False))
    op.add_column('sites', sa.Column('navbar_style', sa.String(length=16), server_default='bordered', nullable=False))


def downgrade() -> None:
    op.drop_column('sites', 'navbar_style')
    op.drop_column('sites', 'navbar_alignment')
    op.drop_column('sites', 'button_style')
    op.drop_column('sites', 'font_family')
    op.drop_column('sites', 'custom_color')
    op.drop_column('sites', 'color_theme')
    op.drop_column('sites', 'site_mode')
    
    op.alter_column('sites', 'template_id', new_column_name='theme_id', existing_type=sa.String(32), existing_nullable=False, server_default='editorial')
