"""add user contact and social fields

Revision ID: 9c7f1e2d4a56
Revises: 6a2d1b0f9e31
Create Date: 2026-04-14 13:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c7f1e2d4a56"
down_revision: Union[str, Sequence[str], None] = "6a2d1b0f9e31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("contact_email", sa.String(), nullable=True))
    op.add_column("users", sa.Column("instagram_link", sa.String(), nullable=True))
    op.add_column("users", sa.Column("x_link", sa.String(), nullable=True))
    op.add_column("users", sa.Column("pinterest_link", sa.String(), nullable=True))
    op.add_column("users", sa.Column("facebook_link", sa.String(), nullable=True))
    op.add_column("users", sa.Column("linkedin_link", sa.String(), nullable=True))
    op.add_column("users", sa.Column("github_link", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "github_link")
    op.drop_column("users", "linkedin_link")
    op.drop_column("users", "facebook_link")
    op.drop_column("users", "pinterest_link")
    op.drop_column("users", "x_link")
    op.drop_column("users", "instagram_link")
    op.drop_column("users", "contact_email")
