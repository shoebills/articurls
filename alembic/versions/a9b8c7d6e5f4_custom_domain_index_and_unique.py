"""custom_domain index and full unique constraint

Revision ID: a9b8c7d6e5f4
Revises: f1a2b3c4d5e6
Create Date: 2026-05-03

Adds:
- Case-insensitive index on custom_domain for fast ILIKE lookups
- Full unique constraint on lower(custom_domain) regardless of verification
  status, replacing the partial index that only covered verified domains.
  This closes the race condition where two users could claim the same domain
  while both are in pending state.
"""
from alembic import op

revision = 'a9b8c7d6e5f4'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old partial unique index (verified-only)
    op.execute("DROP INDEX IF EXISTS uq_users_verified_custom_domain_lower;")

    # Full unique index on lower(custom_domain) — covers all non-null values
    # regardless of domain_status. Prevents duplicate claims at DB level.
    op.execute("""
        CREATE UNIQUE INDEX uq_users_custom_domain_lower
        ON users (lower(custom_domain))
        WHERE custom_domain IS NOT NULL;
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_custom_domain_lower;")
    op.execute("""
        CREATE UNIQUE INDEX uq_users_verified_custom_domain_lower
        ON users (lower(custom_domain))
        WHERE custom_domain IS NOT NULL AND is_domain_verified IS TRUE;
    """)
