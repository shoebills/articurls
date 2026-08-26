"""index fixes: drop redundant slug indexes, add composite/partial indexes

- ix_blogs_slug / ix_authors_slug are redundant next to the
  (site_id, slug) unique constraints; no slug-only lookups exist.
- ix_blogs_site_status_published_at serves public listings.
- ix_user_pages_site_status serves page listing + footer queries.
- ix_subscribers_site_active (partial) serves newsletter sends, analytics
  counts, and CSV export.

Revision ID: 0f6a7b8c9d0e
Revises: 9e5f6a7b8c9d
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0f6a7b8c9d0e"
down_revision: Union[str, Sequence[str], None] = "9e5f6a7b8c9d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_blogs_slug", table_name="blogs")
    op.drop_index("ix_authors_slug", table_name="authors")

    op.create_index(
        "ix_blogs_site_status_published_at",
        "blogs",
        ["site_id", "status", "published_at"],
    )
    op.create_index(
        "ix_user_pages_site_status",
        "user_pages",
        ["site_id", "status"],
    )
    op.create_index(
        "ix_subscribers_site_active",
        "subscribers",
        ["site_id"],
        postgresql_where=sa.text("unsubscribed_at IS NULL AND is_confirmed"),
    )


def downgrade() -> None:
    op.drop_index("ix_subscribers_site_active", table_name="subscribers")
    op.drop_index("ix_user_pages_site_status", table_name="user_pages")
    op.drop_index("ix_blogs_site_status_published_at", table_name="blogs")

    op.create_index("ix_authors_slug", "authors", ["slug"])
    op.create_index("ix_blogs_slug", "blogs", ["slug"])