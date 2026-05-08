"""remove ads monetization fields

Revision ID: q4r5s6t7u8v9
Revises: p2q3r4s5t6u7
Create Date: 2026-05-09

"""
from alembic import op
import sqlalchemy as sa


revision = "q4r5s6t7u8v9"
down_revision = "p2q3r4s5t6u7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("blogs", "ads_enabled")
    op.drop_column("users", "ad_frequency")
    op.drop_column("users", "ad_code")
    op.drop_column("users", "ads_enabled")


def downgrade() -> None:
    op.add_column("users", sa.Column("ads_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("ad_code", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("ad_frequency", sa.Integer(), nullable=False, server_default=sa.text("3")))
    op.add_column("blogs", sa.Column("ads_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    op.alter_column("users", "ads_enabled", server_default=None)
    op.alter_column("users", "ad_frequency", server_default=None)
    op.alter_column("blogs", "ads_enabled", server_default=None)
