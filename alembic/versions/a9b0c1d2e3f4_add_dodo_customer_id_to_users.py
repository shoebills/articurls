"""add dodo_customer_id to users

Revision ID: a9b0c1d2e3f4
Revises: z8a9b0c1d2e3
Create Date: 2026-06-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, Sequence[str], None] = "u0v1w2x3y4z5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("dodo_customer_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_users_dodo_customer_id"), "users", ["dodo_customer_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_dodo_customer_id"), table_name="users")
    op.drop_column("users", "dodo_customer_id")
