"""remove welcome email fields

Revision ID: a0b1c2d3e4f6
Revises: e4f5a6b7c8d9
Create Date: 2026-07-28 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a0b1c2d3e4f6"
down_revision: Union[str, Sequence[str], None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "welcome_email_delay_minutes")
    op.drop_column("users", "welcome_email_body_html")
    op.drop_column("users", "welcome_email_subject")
    op.drop_column("users", "welcome_email_enabled")
    op.drop_column("subscribers", "welcome_sent_at")


def downgrade() -> None:
    op.add_column(
        "subscribers",
        sa.Column("welcome_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("welcome_email_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("welcome_email_subject", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("welcome_email_body_html", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column("welcome_email_delay_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("users", "welcome_email_enabled", server_default=None)
    op.alter_column("users", "welcome_email_delay_minutes", server_default=None)
