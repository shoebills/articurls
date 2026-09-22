"""add warning_stage to subscriptions

Revision ID: p3q4r5s6t7u8
Revises: c8d9e0f1a2b3
Create Date: 2026-09-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p3q4r5s6t7u8"
down_revision: Union[str, Sequence[str], None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "subscriptions",
        sa.Column("warning_stage", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("subscriptions", "warning_stage", server_default=None)
    op.create_check_constraint(
        "ck_subscriptions_warning_stage_range",
        "subscriptions",
        "warning_stage >= 0 AND warning_stage <= 3",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_subscriptions_warning_stage_range",
        "subscriptions",
        type_="check",
    )
    op.drop_column("subscriptions", "warning_stage")