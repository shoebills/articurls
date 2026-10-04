"""rename template saas to standard

Updates server_default on sites.template_id to 'standard' and migrates any
existing 'saas' template_id rows to 'standard'.

Revision ID: j3k4l5m6n7o8
Revises: i2j3k4l5m6n7
Create Date: 2026-10-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j3k4l5m6n7o8"
down_revision: Union[str, Sequence[str], None] = "i2j3k4l5m6n7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE sites SET template_id = 'standard' WHERE template_id = 'saas'")
    op.alter_column("sites", "template_id", server_default="standard")


def downgrade() -> None:
    op.alter_column("sites", "template_id", server_default="saas")
    op.execute("UPDATE sites SET template_id = 'saas' WHERE template_id = 'standard'")
