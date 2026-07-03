"""normalize removed custom domains

Revision ID: c2d3e4f5a6b7
Revises: b0c1d2e3f4a5
Create Date: 2026-07-03

Previously, removing a custom domain left `custom_domain` set (a UNIQUE column)
and only marked `domain_status='expired'` with `cloudflare_hostname_id` cleared.
The API masked those rows as "no domain" via a runtime hack, but the stale
hostname permanently reserved the domain and blocked re-use.

Delete now fully clears the row. This migration backfills legacy manually-removed
rows to the same clean state so they don't resurface once the runtime hack is
removed. The signature of a manual removal is domain_status='expired' with a NULL
cloudflare_hostname_id (natural expiry keeps the Cloudflare hostname id set).
"""

from typing import Sequence, Union

from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "b0c1d2e3f4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET custom_domain = NULL,
            domain_status = 'none'::domain_status_enum,
            grace_started_at = NULL,
            grace_expires_at = NULL
        WHERE domain_status = 'expired'::domain_status_enum
          AND cloudflare_hostname_id IS NULL;
        """
    )


def downgrade() -> None:
    # Data normalization is not reversible (the original hostnames are lost).
    pass
