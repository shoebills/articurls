"""drop unused columns: umami_share_url, is_domain_verified

Revision ID: 05c6e4730035
Revises: 05e9d57f0c8b
Create Date: 2026-07-28

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "05c6e4730035"
down_revision: Union[str, Sequence[str], None] = "05e9d57f0c8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "umami_share_url")
    op.drop_column("users", "is_domain_verified")


def downgrade() -> None:
    op.add_column("users", sa.Column("is_domain_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.alter_column("users", "is_domain_verified", server_default=None)
    op.add_column("users", sa.Column("umami_share_url", sa.String(length=512), nullable=True))
