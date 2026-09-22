"""allow null password on users

Revision ID: r4s5t6u7v8w9
Revises: q3r4s5t6u7v8
Create Date: 2026-09-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "r4s5t6u7v8w9"
down_revision: Union[str, Sequence[str], None] = "q3r4s5t6u7v8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "password", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE users SET password = '' WHERE password IS NULL")
    op.alter_column("users", "password", existing_type=sa.String(), nullable=False)
