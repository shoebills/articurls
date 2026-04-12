"""partial unique index on verified custom_domain

Revision ID: d4e5f6a7b8c1
Revises: 131be2b4cb78
Create Date: 2026-04-12

"""

from typing import Sequence, Union

from alembic import op


revision: str = "d4e5f6a7b8c1"
down_revision: Union[str, Sequence[str], None] = "131be2b4cb78"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX uq_users_verified_custom_domain_lower
        ON users (lower(custom_domain))
        WHERE custom_domain IS NOT NULL AND is_domain_verified IS TRUE;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_verified_custom_domain_lower;")
