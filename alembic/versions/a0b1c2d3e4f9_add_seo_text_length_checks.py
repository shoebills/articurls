"""add length checks for custom seo text fields

Revision ID: a0b1c2d3e4f9
Revises: d9e8f7a6b5c4
Create Date: 2026-10-19
"""
from typing import Sequence, Union

from alembic import op


revision: str = "a0b1c2d3e4f9"
down_revision: Union[str, Sequence[str], None] = "d9e8f7a6b5c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # NULL passes CHECK (length(NULL) is NULL, not FALSE), so nullable stays intact.
    op.create_check_constraint(
        "ck_sites_seo_robots_custom_len",
        "sites",
        "length(seo_robots_custom) <= 10000",
    )
    op.create_check_constraint(
        "ck_sites_seo_llms_custom_len",
        "sites",
        "length(seo_llms_custom) <= 10000",
    )


def downgrade() -> None:
    op.drop_constraint("ck_sites_seo_llms_custom_len", "sites", type_="check")
    op.drop_constraint("ck_sites_seo_robots_custom_len", "sites", type_="check")