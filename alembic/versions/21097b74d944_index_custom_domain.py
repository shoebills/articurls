"""index custom domain

Revision ID: 21097b74d944
Revises: i5j6k7l8m9n0
Create Date: 2026-05-07 14:01:32.840193

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "21097b74d944"
down_revision: Union[str, Sequence[str], None] = "i5j6k7l8m9n0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("uq_users_custom_domain_lower", table_name="users", postgresql_where="(custom_domain IS NOT NULL)")
    op.create_index(op.f("ix_users_custom_domain"), "users", ["custom_domain"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_custom_domain"), table_name="users")
    op.create_index("uq_users_custom_domain_lower", "users", [sa.literal_column("lower(custom_domain::text)")], unique=True, postgresql_where="(custom_domain IS NOT NULL)")
