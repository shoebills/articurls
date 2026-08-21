"""fix featured_blog_ids json orphans after uuid migration

Revision ID: c9d8e7f6a5b4
Revises: a1b2c3d4e5f0
Create Date: 2026-08-21 13:00:00.000000

Old integer IDs in sites.featured_blog_ids are invalid after UUID migration.
Mapping was dropped with old columns, so reset to empty array. New selections will store UUID strings.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d8e7f6a5b4'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # sites.featured_blog_ids is JSON (not JSONB), contains old integer IDs like [1,5]
    # After PK migration to UUID those values are orphaned -> reset to []
    op.execute("""
        UPDATE sites
        SET featured_blog_ids = '[]'::json
        WHERE featured_blog_ids IS NOT NULL
          AND featured_blog_ids::text NOT IN ('[]', 'null', '""')
          AND featured_blog_ids::text ~ '\\d+';
    """)


def downgrade() -> None:
    raise NotImplementedError("No downgrade for JSON orphan fix - old integer IDs are already lost.")
