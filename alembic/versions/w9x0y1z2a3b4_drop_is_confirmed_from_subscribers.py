"""drop is_confirmed from subscribers

Revision ID: w9x0y1z2a3b4
Revises: v8w9x0y1z2a3
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "w9x0y1z2a3b4"
down_revision: Union[str, Sequence[str], None] = "v8w9x0y1z2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_subscribers_site_active", table_name="subscribers")
    op.drop_index("ix_subscribers_is_confirmed", table_name="subscribers")
    op.drop_column("subscribers", "is_confirmed")
    op.create_index(
        "ix_subscribers_site_active",
        "subscribers",
        ["site_id"],
        postgresql_where=sa.text("unsubscribed_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_subscribers_site_active", table_name="subscribers")
    op.add_column("subscribers", sa.Column("is_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index("ix_subscribers_is_confirmed", "subscribers", ["is_confirmed"])
    op.create_index(
        "ix_subscribers_site_active",
        "subscribers",
        ["site_id"],
        postgresql_where=sa.text("unsubscribed_at IS NULL AND is_confirmed"),
    )