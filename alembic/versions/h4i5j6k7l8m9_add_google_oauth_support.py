"""add_google_oauth_support

Add google_id field to users table to support Google OAuth login.

Revision ID: h4i5j6k7l8m9
Revises: g3h4i5j6k7l8
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa

revision = "h4i5j6k7l8m9"
down_revision = "g3h4i5j6k7l8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add google_id column: nullable, unique, indexed
    op.add_column(
        "users",
        sa.Column("google_id", sa.String(), nullable=True),
    )
    
    # Create unique index on google_id (only for non-null values)
    # This allows multiple NULL values but ensures unique Google IDs
    op.create_index(
        "ix_users_google_id",
        "users",
        ["google_id"],
        unique=True,
        postgresql_where=sa.text("google_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_column("users", "google_id")
