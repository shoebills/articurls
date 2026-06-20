"""add token_version to users

Revision ID: u0v1w2x3y4z5
Revises: t0v1w2x3y4z5
Create Date: 2026-06-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "u0v1w2x3y4z5"
down_revision: Union[str, Sequence[str], None] = "t0v1w2x3y4z5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=True))
    op.execute("UPDATE users SET token_version = 0 WHERE token_version IS NULL")
    op.alter_column("users", "token_version", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "token_version")
