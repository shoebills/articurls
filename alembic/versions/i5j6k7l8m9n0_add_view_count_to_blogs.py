"""add view_count to blogs

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2026-05-07

Adds a denormalized view_count column to blogs table.
Backfills from existing views table so historical data is preserved.
Uses BIGINT to handle viral posts and long-lived blogs safely.
"""
from alembic import op
import sqlalchemy as sa

revision = 'i5j6k7l8m9n0'
down_revision = 'h4i5j6k7l8m9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add column — BIGINT to handle viral posts safely (INTEGER maxes at ~2.1B)
    op.add_column('blogs', sa.Column('view_count', sa.BigInteger(), nullable=False, server_default='0'))

    # Backfill from existing views table — one-time, runs at migration time
    op.execute("""
        UPDATE blogs b
        SET view_count = sub.cnt
        FROM (
            SELECT blog_id, COUNT(*) AS cnt
            FROM views
            GROUP BY blog_id
        ) sub
        WHERE b.blog_id = sub.blog_id
    """)


def downgrade() -> None:
    op.drop_column('blogs', 'view_count')
