"""drop_user_link

Remove link column from users table as the feature is being removed.

Revision ID: g3h4i5j6k7l8
Revises: f2g3h4i5j6k7
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa

revision = "g3h4i5j6k7l8"
down_revision = "f2g3h4i5j6k7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("users", "link")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "link",
            sa.String(),
            nullable=True,
        ),
    )
