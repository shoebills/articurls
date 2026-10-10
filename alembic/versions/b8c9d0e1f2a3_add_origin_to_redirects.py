"""add origin to redirects

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-10-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE redirect_origin AS ENUM ('manual', 'automatic')")
    op.add_column(
        "redirects",
        sa.Column(
            "origin",
            postgresql.ENUM(name="redirect_origin", create_type=False),
            nullable=False,
            server_default="manual",
        ),
    )


def downgrade() -> None:
    op.drop_column("redirects", "origin")
    op.execute("DROP TYPE redirect_origin")
