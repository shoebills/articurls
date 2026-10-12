"""lowercase blog_status and page_status enum values

Revision ID: j9k8l7m6n5o4
Revises: f8a1b2c3d4e5
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op


revision: str = "j9k8l7m6n5o4"
down_revision: Union[str, Sequence[str], None] = "f8a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE blog_status RENAME TO blog_status_old")
    op.execute("CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived', 'scheduled')")
    op.execute(
        "ALTER TABLE blogs ALTER COLUMN status TYPE blog_status "
        "USING lower(status::text)::blog_status"
    )
    op.execute("DROP TYPE blog_status_old")

    op.execute("ALTER TABLE user_pages ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TYPE page_status RENAME TO page_status_old")
    op.execute("CREATE TYPE page_status AS ENUM ('draft', 'published', 'archived')")
    op.execute(
        "ALTER TABLE user_pages ALTER COLUMN status TYPE page_status "
        "USING lower(status::text)::page_status"
    )
    op.execute("ALTER TABLE user_pages ALTER COLUMN status SET DEFAULT 'draft'")
    op.execute("DROP TYPE page_status_old")


def downgrade() -> None:
    op.execute("ALTER TYPE blog_status RENAME TO blog_status_old")
    op.execute("CREATE TYPE blog_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED')")
    op.execute(
        "ALTER TABLE blogs ALTER COLUMN status TYPE blog_status "
        "USING upper(status::text)::blog_status"
    )
    op.execute("DROP TYPE blog_status_old")

    op.execute("ALTER TABLE user_pages ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TYPE page_status RENAME TO page_status_old")
    op.execute("CREATE TYPE page_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED')")
    op.execute(
        "ALTER TABLE user_pages ALTER COLUMN status TYPE page_status "
        "USING upper(status::text)::page_status"
    )
    op.execute("ALTER TABLE user_pages ALTER COLUMN status SET DEFAULT 'DRAFT'")
    op.execute("DROP TYPE page_status_old")