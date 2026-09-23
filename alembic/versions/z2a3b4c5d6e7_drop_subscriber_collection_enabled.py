"""drop subscriber_collection_enabled from sites

Revision ID: z2a3b4c5d6e7
Revises: y1z2a3b4c5d6
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "z2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "y1z2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("sites", "subscriber_collection_enabled")


def downgrade() -> None:
    op.add_column(
        "sites",
        sa.Column("subscriber_collection_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
