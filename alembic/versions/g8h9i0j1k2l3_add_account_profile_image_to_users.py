"""add account profile image to users (decouple account identity from authors)

Revision ID: g8h9i0j1k2l3
Revises: f7a8b9c0d1e2
Create Date: 2026-08-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'g8h9i0j1k2l3'
down_revision: Union[str, Sequence[str], None] = 'f7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('profile_image_url', sa.String(), nullable=True))

    # Backfill account avatar from the user's oldest site author avatar,
    # preserving what the account currently shows in dashboard/profile.
    op.execute(
        """
        UPDATE users u
        SET profile_image_url = sub.profile_image_url
        FROM (
            SELECT DISTINCT ON (s.user_id) s.user_id, a.profile_image_url
            FROM authors a
            JOIN sites s ON s.site_id = a.site_id
            WHERE a.profile_image_url IS NOT NULL
            ORDER BY s.user_id, a.created_at ASC NULLS LAST
        ) sub
        WHERE u.user_id = sub.user_id
          AND u.profile_image_url IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column('users', 'profile_image_url')