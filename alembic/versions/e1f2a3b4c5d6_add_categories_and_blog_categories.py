"""add categories and blog_categories tables

Revision ID: e1f2a3b4c5d6
Revises: d9e0f1a2b3c4
Create Date: 2026-04-30 03:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d9e0f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("category_id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("show_in_menu", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("menu_order", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "slug", name="uq_categories_user_slug"),
    )
    op.create_index("ix_categories_user_menu_order", "categories", ["user_id", "menu_order"])

    op.create_table(
        "blog_categories",
        sa.Column("blog_category_id", sa.Integer(), primary_key=True),
        sa.Column("blog_id", sa.Integer(), sa.ForeignKey("blogs.blog_id"), nullable=False, index=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.category_id"), nullable=False, index=True),
        sa.UniqueConstraint("blog_id", "category_id", name="uq_blog_categories_blog_category"),
    )


def downgrade() -> None:
    op.drop_table("blog_categories")
    op.drop_index("ix_categories_user_menu_order", table_name="categories")
    op.drop_table("categories")
