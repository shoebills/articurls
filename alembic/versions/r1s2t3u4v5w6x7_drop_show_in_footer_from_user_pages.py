"""drop show_in_footer from user_pages

Revision ID: r1s2t3u4v5w6x7
Revises: q0r1s2t3u4v5w6
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "r1s2t3u4v5w6x7"
down_revision: Union[str, Sequence[str], None] = "q0r1s2t3u4v5w6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("user_pages", "show_in_footer")


def downgrade() -> None:
    op.add_column("user_pages", sa.Column("show_in_footer", sa.Boolean(), nullable=False, server_default=sa.text("false")))
