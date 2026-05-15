"""add welcome email fields

Revision ID: v3w4x5y6z7a8
Revises: u2v3w4x5y6z7
Create Date: 2026-05-16 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "v3w4x5y6z7a8"
down_revision: Union[str, Sequence[str], None] = "u2v3w4x5y6z7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
    op.add_column(
        "subscribers",
        sa.Column("welcome_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("users", "welcome_email_enabled", server_default=None)
    op.alter_column("users", "welcome_email_delay_minutes", server_default=None)


def downgrade() -> None:
    op.drop_column("subscribers", "welcome_sent_at")
    op.drop_column("users", "welcome_email_delay_minutes")
    op.drop_column("users", "welcome_email_body_html")
    op.drop_column("users", "welcome_email_subject")
    op.drop_column("users", "welcome_email_enabled")
