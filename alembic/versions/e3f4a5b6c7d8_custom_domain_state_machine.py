"""custom domain state machine

Adds domain_status, cloudflare_hostname_id, verified_at, grace_started_at,
grace_expires_at columns to users.

Replaces the old partial unique index (only on verified rows) with a full
case-insensitive unique index on every non-NULL custom_domain value, so that
two users can never claim the same hostname regardless of verification state.

Backfills domain_status from the existing is_domain_verified flag:
  - is_domain_verified = TRUE  → "active"   (assume Pro was active when verified)
  - is_domain_verified = FALSE → "pending"  (domain set but not yet verified)
  - custom_domain IS NULL      → "none"

Revision ID: e3f4a5b6c7d8
Revises: d4e5f6a7b8c1
Create Date: 2026-05-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
   
    op.add_column(
        "users",
        sa.Column(
            "domain_status",
            sa.String(),
            nullable=False,
            server_default="none",
        ),
    )
    op.add_column(
        "users",
        sa.Column("cloudflare_hostname_id", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("grace_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("grace_expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        """
        UPDATE users
        SET domain_status = CASE
            WHEN custom_domain IS NULL          THEN 'none'
            WHEN is_domain_verified IS TRUE     THEN 'active'
            ELSE                                     'pending'
        END
        """
    )

    op.execute("DROP INDEX IF EXISTS uq_users_verified_custom_domain_lower;")

    op.execute(
        """
        CREATE UNIQUE INDEX uq_users_custom_domain_lower
        ON users (lower(custom_domain))
        WHERE custom_domain IS NOT NULL;
        """
    )


def downgrade() -> None:
    # Drop new index
    op.execute("DROP INDEX IF EXISTS uq_users_custom_domain_lower;")

    # Restore old partial index
    op.execute(
        """
        CREATE UNIQUE INDEX uq_users_verified_custom_domain_lower
        ON users (lower(custom_domain))
        WHERE custom_domain IS NOT NULL AND is_domain_verified IS TRUE;
        """
    )

    # Drop new columns
    op.drop_column("users", "grace_expires_at")
    op.drop_column("users", "grace_started_at")
    op.drop_column("users", "verified_at")
    op.drop_column("users", "cloudflare_hostname_id")
    op.drop_column("users", "domain_status")
