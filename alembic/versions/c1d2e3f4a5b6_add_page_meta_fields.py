"""add meta_title and meta_description to user_pages

Revision ID: c1d2e3f4a5b6
Revises: b1c2d3e4f5a6
Create Date: 2026-05-03
"""
from alembic import op
import sqlalchemy as sa

revision = 'c1d2e3f4a5b6'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user_pages', sa.Column('meta_title', sa.String(), nullable=True))
    op.add_column('user_pages', sa.Column('meta_description', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_pages', 'meta_description')
    op.drop_column('user_pages', 'meta_title')
