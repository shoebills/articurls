"""add ads monetization fields

Revision ID: 2d3e4f5a6b7c
Revises: f12a4c9d8e31
Create Date: 2026-04-14 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2d3e4f5a6b7c"
down_revision: Union[str, Sequence[str], None] = "f12a4c9d8e31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("ads_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("ad_code", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("ad_frequency", sa.Integer(), nullable=False, server_default=sa.text("3")))
    op.add_column("blogs", sa.Column("ads_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    op.alter_column("users", "ads_enabled", server_default=None)
    op.alter_column("users", "ad_frequency", server_default=None)
    op.alter_column("blogs", "ads_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("blogs", "ads_enabled")
    op.drop_column("users", "ad_frequency")
    op.drop_column("users", "ad_code")
    op.drop_column("users", "ads_enabled")
