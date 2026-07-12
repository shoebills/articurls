"""rename cloudflare_hostname_id to domainee_domain_id

Revision ID: x5y6z7a8b9c0
Revises: w4x5y6z7a8b9
Create Date: 2026-05-21

Applied on production during the Domainee experiment. Kept in history so Alembic
chains correctly; superseded by y7z8a9b0c1d2 (CF Custom Hostnames rollback).
"""

from typing import Sequence, Union

from alembic import op


revision: str = "x5y6z7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "w4x5y6z7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "cloudflare_hostname_id",
        new_column_name="domainee_domain_id",
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "domainee_domain_id",
        new_column_name="cloudflare_hostname_id",
    )
