"""add nav_blog_name_size to users

Revision ID: r5s6t7u8v9w0
Revises: q4r5s6t7u8v9
Create Date: 2026-05-10

"""
from alembic import op
import sqlalchemy as sa


revision = "r5s6t7u8v9w0"
down_revision = "q4r5s6t7u8v9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "nav_blog_name_size",
            sa.String(length=16),
            nullable=False,
            server_default="medium",
        ),
    )
    op.alter_column("users", "nav_blog_name_size", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "nav_blog_name_size")
