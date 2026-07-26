"""drop cloudflare_hostname_id from users

Revision ID: e4f5a6b7c8d9
Revises: a1b2c3d4e5f8
Create Date: 2026-07-26

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "cloudflare_hostname_id")


def downgrade() -> None:
    op.add_column("users", sa.Column("cloudflare_hostname_id", sa.String(), nullable=True))
