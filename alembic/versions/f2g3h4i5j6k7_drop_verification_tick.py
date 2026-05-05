"""drop_verification_tick

Remove verification_tick column from users table as the feature is being removed.

Revision ID: f2g3h4i5j6k7
Revises: b3c4d5e6f7a8
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa

revision = "f2g3h4i5j6k7"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("users", "verification_tick")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "verification_tick",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
