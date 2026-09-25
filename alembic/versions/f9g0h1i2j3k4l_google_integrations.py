"""google integrations fields on sites

Revision ID: f9g0h1i2j3k4l
Revises: e8f9g0h1i2j3
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9g0h1i2j3k4l"
down_revision: Union[str, Sequence[str], None] = "e8f9g0h1i2j3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sites", sa.Column("ga_measurement_id", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("adsense_publisher_id", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("search_console_property", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("search_console_verification_token", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("sites", "search_console_verification_token")
    op.drop_column("sites", "search_console_property")
    op.drop_column("sites", "adsense_publisher_id")
    op.drop_column("sites", "ga_measurement_id")