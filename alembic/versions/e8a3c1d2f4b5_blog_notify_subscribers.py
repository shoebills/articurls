"""blog notify_subscribers per post

Revision ID: e8a3c1d2f4b5
Revises: d4e5f6a7b8c1
Create Date: 2026-04-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e8a3c1d2f4b5"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "blogs",
        sa.Column(
            "notify_subscribers",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.execute(
        """
        UPDATE blogs b
        SET notify_subscribers = true
        FROM users u
        WHERE b.user_id = u.user_id AND u.email_notifications = true;
        """
    )
    op.alter_column("blogs", "notify_subscribers", server_default=None)


def downgrade() -> None:
    op.drop_column("blogs", "notify_subscribers")
