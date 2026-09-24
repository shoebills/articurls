"""phase9 advanced seo and domain columns on sites

Revision ID: e8f9g0h1i2j3
Revises: d7e8f9g0h1i2
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8f9g0h1i2j3"
down_revision: Union[str, Sequence[str], None] = "d7e8f9g0h1i2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sites", sa.Column("seo_indexing_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("seo_noindex_categories", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("sites", sa.Column("seo_noindex_authors", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("sites", sa.Column("seo_noindex_pages", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("sites", sa.Column("seo_trailing_slash_listings", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("sites", sa.Column("seo_trailing_slash_jsonld", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("sites", sa.Column("seo_sitemap_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("seo_robots_mode", sa.String(length=16), nullable=False, server_default="auto"))
    op.add_column("sites", sa.Column("seo_robots_custom", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("seo_llms_mode", sa.String(length=16), nullable=False, server_default="auto"))
    op.add_column("sites", sa.Column("seo_llms_custom", sa.Text(), nullable=True))
    op.create_check_constraint("ck_sites_seo_robots_mode", "sites", "seo_robots_mode IN ('auto', 'custom')")
    op.create_check_constraint("ck_sites_seo_llms_mode", "sites", "seo_llms_mode IN ('auto', 'custom')")


def downgrade() -> None:
    op.drop_constraint("ck_sites_seo_llms_mode", "sites", type_="check")
    op.drop_constraint("ck_sites_seo_robots_mode", "sites", type_="check")
    op.drop_column("sites", "seo_llms_custom")
    op.drop_column("sites", "seo_llms_mode")
    op.drop_column("sites", "seo_robots_custom")
    op.drop_column("sites", "seo_robots_mode")
    op.drop_column("sites", "seo_sitemap_enabled")
    op.drop_column("sites", "seo_trailing_slash_jsonld")
    op.drop_column("sites", "seo_trailing_slash_listings")
    op.drop_column("sites", "seo_noindex_pages")
    op.drop_column("sites", "seo_noindex_authors")
    op.drop_column("sites", "seo_noindex_categories")
    op.drop_column("sites", "seo_indexing_enabled")