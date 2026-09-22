"""rename template editorial to standard

Revision ID: q3r4s5t6u7v8
Revises: p3q4r5s6t7u8
Create Date: 2026-09-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "q3r4s5t6u7v8"
down_revision: Union[str, Sequence[str], None] = "p3q4r5s6t7u8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE sites SET template_id = 'standard' WHERE template_id = 'editorial'")
    op.alter_column("sites", "template_id", server_default="standard")


def downgrade() -> None:
    op.execute("UPDATE sites SET template_id = 'editorial' WHERE template_id = 'standard'")
    op.alter_column("sites", "template_id", server_default="editorial")