"""convert email_logs.status and transactions.status to enums

Revision ID: 7c3d4e5f6a7b
Revises: 6b2c3d4e5f6a
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c3d4e5f6a7b"
down_revision: Union[str, Sequence[str], None] = "6b2c3d4e5f6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE email_log_status AS ENUM ('pending', 'sent', 'failed')")
    op.execute(
        "ALTER TABLE email_logs ALTER COLUMN status TYPE email_log_status "
        "USING status::text::email_log_status"
    )

    op.execute(
        "CREATE TYPE transaction_status AS ENUM "
        "('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'refund_failed')"
    )
    op.execute(
        "ALTER TABLE transactions ALTER COLUMN status TYPE transaction_status "
        "USING status::text::transaction_status"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE transactions ALTER COLUMN status TYPE varchar "
        "USING status::text"
    )
    op.execute("DROP TYPE transaction_status")
    op.execute(
        "ALTER TABLE email_logs ALTER COLUMN status TYPE varchar "
        "USING status::text"
    )
    op.execute("DROP TYPE email_log_status")