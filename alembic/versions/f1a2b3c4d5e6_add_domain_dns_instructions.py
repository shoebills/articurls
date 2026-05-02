"""add_domain_dns_instructions

Revision ID: f1a2b3c4d5e6
Revises: e3f4a5b6c7d8
Create Date: 2026-05-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'f1a2b3c4d5e6'
down_revision = 'e3f4a5b6c7d8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('domain_dns_instructions', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'domain_dns_instructions')
