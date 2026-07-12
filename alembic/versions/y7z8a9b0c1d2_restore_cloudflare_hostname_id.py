"""restore cloudflare_hostname_id after Domainee rollback

Revision ID: y7z8a9b0c1d2
Revises: x5y6z7a8b9c0
Create Date: 2026-05-22

Production may have domainee_domain_id from the Domainee migration. This restores
cloudflare_hostname_id for CF Custom Hostnames. No-op if the column already exists.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "y7z8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "x5y6z7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _user_columns() -> set[str]:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {col["name"] for col in insp.get_columns("users")}


def upgrade() -> None:
    cols = _user_columns()
    if "domainee_domain_id" in cols and "cloudflare_hostname_id" not in cols:
        op.alter_column(
            "users",
            "domainee_domain_id",
            new_column_name="cloudflare_hostname_id",
        )
    elif "cloudflare_hostname_id" not in cols:
        op.add_column(
            "users",
            sa.Column("cloudflare_hostname_id", sa.String(), nullable=True),
        )


def downgrade() -> None:
    cols = _user_columns()
    if "cloudflare_hostname_id" in cols and "domainee_domain_id" not in cols:
        op.alter_column(
            "users",
            "cloudflare_hostname_id",
            new_column_name="domainee_domain_id",
        )
