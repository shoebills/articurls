"""phase7 settings expansion

Revision ID: y1z2a3b4c5d6
Revises: x0y1z2a3b4c5
Create Date: 2026-09-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "y1z2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "x0y1z2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename nav_blog_name -> site_name
    op.alter_column("sites", "nav_blog_name", new_column_name="site_name")

    # 2. Drop obsolete columns
    op.drop_column("sites", "nav_blog_name_size")
    op.drop_column("sites", "show_about_section")
    op.drop_column("sites", "about_title")
    op.drop_column("sites", "footer_system_links_enabled")
    op.drop_column("sites", "footer_newsletter_enabled")

    # 3. Add General columns
    op.add_column("sites", sa.Column("hero_title", sa.String(120), nullable=True))
    op.add_column("sites", sa.Column("hero_description", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("site_language", sa.String(8), nullable=False, server_default="en"))
    op.add_column("sites", sa.Column("og_locale", sa.String(10), nullable=True))
    op.add_column("sites", sa.Column("atom_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # 4. Add Navigation columns
    op.add_column("sites", sa.Column("logo_url", sa.String(), nullable=True))
    op.add_column("sites", sa.Column("logo_link", sa.String(), nullable=True, server_default="/"))
    op.add_column("sites", sa.Column("search_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))

    # 5. Add Standalone Content End CTA columns
    op.add_column("sites", sa.Column("cta_heading", sa.String(120), nullable=True))
    op.add_column("sites", sa.Column("cta_description", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("cta_button_text", sa.String(50), nullable=True))
    op.add_column("sites", sa.Column("cta_button_url", sa.String(), nullable=True))
    op.add_column("sites", sa.Column("cta_show_on_posts", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("cta_show_on_pages", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # 6. Add Footer columns
    op.add_column("sites", sa.Column("footer_description", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("footer_show_sitemap", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("footer_show_rss", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("footer_show_atom", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # 7. Add Newsletter columns
    op.add_column("sites", sa.Column("newsletter_headline", sa.String(120), nullable=True))
    op.add_column("sites", sa.Column("newsletter_text", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("newsletter_disclaimer", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("newsletter_button_text", sa.String(50), nullable=True, server_default="Subscribe"))
    op.add_column("sites", sa.Column("newsletter_show_near_header", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("sites", sa.Column("newsletter_show_in_footer", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("newsletter_webhook_url", sa.Text(), nullable=True))
    op.add_column("sites", sa.Column("newsletter_webhook_token", sa.Text(), nullable=True))

    # 8. Add Content columns
    op.add_column("sites", sa.Column("posts_per_page", sa.Integer(), nullable=False, server_default="12"))
    op.add_column("sites", sa.Column("pagination_type", sa.String(16), nullable=False, server_default="prev_next"))
    op.add_column("sites", sa.Column("toc_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))

    # 9. Add check constraint on posts_per_page
    op.create_check_constraint(
        "ck_sites_posts_per_page",
        "sites",
        "posts_per_page >= 6 AND posts_per_page <= 48",
    )


def downgrade() -> None:
    op.drop_constraint("ck_sites_posts_per_page", "sites", type_="check")

    op.drop_column("sites", "toc_enabled")
    op.drop_column("sites", "pagination_type")
    op.drop_column("sites", "posts_per_page")

    op.drop_column("sites", "newsletter_webhook_token")
    op.drop_column("sites", "newsletter_webhook_url")
    op.drop_column("sites", "newsletter_show_in_footer")
    op.drop_column("sites", "newsletter_show_near_header")
    op.drop_column("sites", "newsletter_button_text")
    op.drop_column("sites", "newsletter_disclaimer")
    op.drop_column("sites", "newsletter_text")
    op.drop_column("sites", "newsletter_headline")

    op.drop_column("sites", "footer_show_atom")
    op.drop_column("sites", "footer_show_rss")
    op.drop_column("sites", "footer_show_sitemap")
    op.drop_column("sites", "footer_description")

    op.drop_column("sites", "cta_show_on_pages")
    op.drop_column("sites", "cta_show_on_posts")
    op.drop_column("sites", "cta_button_url")
    op.drop_column("sites", "cta_button_text")
    op.drop_column("sites", "cta_description")
    op.drop_column("sites", "cta_heading")

    op.drop_column("sites", "search_enabled")
    op.drop_column("sites", "logo_link")
    op.drop_column("sites", "logo_url")

    op.drop_column("sites", "atom_enabled")
    op.drop_column("sites", "og_locale")
    op.drop_column("sites", "site_language")
    op.drop_column("sites", "hero_description")
    op.drop_column("sites", "hero_title")

    op.add_column("sites", sa.Column("footer_newsletter_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("footer_system_links_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("sites", sa.Column("about_title", sa.String(40), nullable=True))
    op.add_column("sites", sa.Column("show_about_section", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("sites", sa.Column("nav_blog_name_size", sa.String(16), nullable=False, server_default="medium"))

    op.alter_column("sites", "site_name", new_column_name="nav_blog_name")
