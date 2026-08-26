"""drop legacy views table and unused users.remove_branding

Revision ID: 4f0a1b2c3d4e
Revises: g8h9i0j1k2l3
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4f0a1b2c3d4e"
down_revision: Union[str, Sequence[str], None] = "g8h9i0j1k2l3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # views was dropped by b2c3d4e5f6a8; this normalizes DBs where it was
    # applied out of order or never dropped. The model is gone entirely.
    op.execute("DROP TABLE IF EXISTS views")

    # remove_branding exists only in the migration that added it — no code
    # ever read or wrote it.
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS remove_branding")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS remove_branding BOOLEAN "
        "NOT NULL DEFAULT false"
    )