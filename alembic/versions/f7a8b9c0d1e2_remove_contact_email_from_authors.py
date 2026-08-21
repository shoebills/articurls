"""remove contact_email from authors

Revision ID: f7a8b9c0d1e2
Revises: a2b3c4d5e6f7
Create Date: 2026-08-21 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('authors', 'contact_email')


def downgrade() -> None:
    op.add_column('authors', sa.Column('contact_email', sa.String(), nullable=True))
