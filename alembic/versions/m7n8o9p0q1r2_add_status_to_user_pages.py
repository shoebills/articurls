"""add status lifecycle to user pages

Revision ID: m7n8o9p0q1r2
Revises: k1l2m3n4o5p6
Create Date: 2026-05-08

"""
from alembic import op
import sqlalchemy as sa


revision = "m7n8o9p0q1r2"
down_revision = "k1l2m3n4o5p6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    page_status = sa.Enum("draft", "published", "archived", name="page_status")
    page_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "user_pages",
        sa.Column(
            "status",
            page_status,
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
    )
    op.add_column("user_pages", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_user_pages_published_at", "user_pages", ["published_at"], unique=False)

    # Existing pages were already public before lifecycle support, so backfill as published.
    op.execute("UPDATE user_pages SET status = 'published' WHERE status = 'draft'")
    op.execute("UPDATE user_pages SET published_at = NOW() WHERE status = 'published' AND published_at IS NULL")

    op.alter_column("user_pages", "status", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_user_pages_published_at", table_name="user_pages")
    op.drop_column("user_pages", "published_at")
    op.drop_column("user_pages", "status")
    sa.Enum(name="page_status").drop(op.get_bind(), checkfirst=True)
