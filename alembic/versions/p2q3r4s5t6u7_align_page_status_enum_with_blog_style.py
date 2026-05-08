"""align page_status enum with blog style

Revision ID: p2q3r4s5t6u7
Revises: n1o2p3q4r5s6
Create Date: 2026-05-08

"""
from alembic import op
import sqlalchemy as sa


revision = "p2q3r4s5t6u7"
down_revision = "n1o2p3q4r5s6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Convert existing lowercase enum values to uppercase text first.
    op.execute("ALTER TABLE user_pages ALTER COLUMN status TYPE text USING upper(status::text)")

    # Recreate enum to match SQLAlchemy's default Enum(PageStatus) name-based mapping.
    op.execute("ALTER TYPE page_status RENAME TO page_status_old")
    op.execute("CREATE TYPE page_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED')")
    op.execute("ALTER TABLE user_pages ALTER COLUMN status TYPE page_status USING status::page_status")
    op.execute("ALTER TABLE user_pages ALTER COLUMN status SET DEFAULT 'DRAFT'")
    op.execute("DROP TYPE page_status_old")


def downgrade() -> None:
    op.execute("ALTER TABLE user_pages ALTER COLUMN status TYPE text USING lower(status::text)")
    op.execute("ALTER TYPE page_status RENAME TO page_status_old")
    op.execute("CREATE TYPE page_status AS ENUM ('draft', 'published', 'archived')")
    op.execute("ALTER TABLE user_pages ALTER COLUMN status TYPE page_status USING status::page_status")
    op.execute("ALTER TABLE user_pages ALTER COLUMN status SET DEFAULT 'draft'")
    op.execute("DROP TYPE page_status_old")
