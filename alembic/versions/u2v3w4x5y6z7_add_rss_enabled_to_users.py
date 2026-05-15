"""add rss_enabled to users

Revision ID: u2v3w4x5y6z7
Revises: t1u2v3w4x5y6
Create Date: 2026-05-15 18:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "u2v3w4x5y6z7"
down_revision: Union[str, Sequence[str], None] = "t1u2v3w4x5y6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("rss_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("users", "rss_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "rss_enabled")
