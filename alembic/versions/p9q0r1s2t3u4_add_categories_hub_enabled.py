"""add categories_hub_enabled to sites

Opt-in/out toggle for the /categories hub page (default on, preserving
current behavior). When off, the hub 404s and is omitted from sitemap.xml
and llms.txt. Indexability when on is governed by the existing
seo_noindex_categories flag.

Revision ID: p9q0r1s2t3u4
Revises: n7o8p9q0r1s2
Create Date: 2026-10-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p9q0r1s2t3u4"
down_revision: Union[str, Sequence[str], None] = "n7o8p9q0r1s2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sites",
        sa.Column("categories_hub_enabled", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("sites", "categories_hub_enabled")
