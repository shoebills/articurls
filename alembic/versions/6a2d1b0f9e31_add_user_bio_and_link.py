"""add user bio and link fields

Revision ID: 6a2d1b0f9e31
Revises: 5d5086c2114f
Create Date: 2026-04-14 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6a2d1b0f9e31"
down_revision: Union[str, Sequence[str], None] = "5d5086c2114f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("link", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "link")
    op.drop_column("users", "bio")
