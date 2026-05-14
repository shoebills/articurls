"""add remove_branding toggle to users

Revision ID: s9t0u1v2w3x4
Revises: h4i5j6k7l8m9, r5s6t7u8v9w0
Create Date: 2026-05-14

"""
from alembic import op
import sqlalchemy as sa


revision = "s9t0u1v2w3x4"
down_revision = ("h4i5j6k7l8m9", "r5s6t7u8v9w0")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "remove_branding",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "remove_branding")
