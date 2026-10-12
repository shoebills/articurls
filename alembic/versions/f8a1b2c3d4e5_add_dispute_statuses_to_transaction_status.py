"""add dispute statuses to transaction_status enum

Revision ID: f8a1b2c3d4e5
Revises: c9d0e1f2a3b4
Create Date: 2026-10-12

"""

from typing import Sequence, Union

from alembic import op


revision: str = "f8a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DISPUTE_STATUSES = (
    "dispute_opened",
    "dispute_challenged",
    "dispute_accepted",
    "dispute_cancelled",
    "dispute_expired",
    "dispute_won",
    "dispute_lost",
)


def upgrade() -> None:
    for status_val in DISPUTE_STATUSES:
        op.execute(f"ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS '{status_val}'")


def downgrade() -> None:
    op.execute(
        "UPDATE transactions SET status = 'failed' "
        "WHERE status::text IN ('dispute_opened', 'dispute_challenged', 'dispute_accepted', 'dispute_cancelled', 'dispute_expired', 'dispute_lost')"
    )
    op.execute(
        "UPDATE transactions SET status = 'succeeded' "
        "WHERE status::text = 'dispute_won'"
    )
    op.execute("ALTER TABLE transactions ALTER COLUMN status TYPE varchar USING status::text")
    op.execute("DROP TYPE transaction_status")
    op.execute(
        "CREATE TYPE transaction_status AS ENUM "
        "('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'refund_failed')"
    )
    op.execute(
        "ALTER TABLE transactions ALTER COLUMN status TYPE transaction_status "
        "USING status::transaction_status"
    )
    op.execute("ALTER TABLE transactions ALTER COLUMN status SET DEFAULT 'pending'")
