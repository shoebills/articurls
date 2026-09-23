"""drop unsubscribed_at from subscribers

Revision ID: x0y1z2a3b4c5
Revises: w9x0y1z2a3b4
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "x0y1z2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "w9x0y1z2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_subscribers_site_active", table_name="subscribers")
    op.drop_index("ix_subscribers_unsubscribed_at", table_name="subscribers")
    op.drop_constraint("ck_subscribers_unsub_after_sub", "subscribers", type_="check")
    op.drop_column("subscribers", "unsubscribed_at")


def downgrade() -> None:
    op.add_column("subscribers", sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_subscribers_unsubscribed_at", "subscribers", ["unsubscribed_at"])
    op.create_check_constraint(
        "ck_subscribers_unsub_after_sub",
        "subscribers",
        "unsubscribed_at IS NULL OR subscribed_at IS NULL OR unsubscribed_at >= subscribed_at",
    )
    op.create_index(
        "ix_subscribers_site_active",
        "subscribers",
        ["site_id"],
        postgresql_where=sa.text("unsubscribed_at IS NULL"),
    )