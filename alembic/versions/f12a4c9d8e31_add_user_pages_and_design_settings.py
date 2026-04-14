"""add user pages and design settings

Revision ID: f12a4c9d8e31
Revises: 9c7f1e2d4a56
Create Date: 2026-04-14 19:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f12a4c9d8e31"
down_revision: Union[str, Sequence[str], None] = "9c7f1e2d4a56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("navbar_enabled", sa.Boolean(), nullable=True))
    op.add_column("users", sa.Column("nav_blog_name", sa.String(), nullable=True))
    op.add_column("users", sa.Column("nav_menu_enabled", sa.Boolean(), nullable=True))
    op.execute("UPDATE users SET navbar_enabled = false WHERE navbar_enabled IS NULL")
    op.execute("UPDATE users SET nav_menu_enabled = false WHERE nav_menu_enabled IS NULL")
    op.alter_column("users", "navbar_enabled", nullable=False)
    op.alter_column("users", "nav_menu_enabled", nullable=False)

    op.create_table(
        "user_pages",
        sa.Column("page_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("show_in_menu", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("menu_order", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("page_id"),
        sa.UniqueConstraint("user_id", "slug", name="uq_user_pages_user_slug"),
    )
    op.create_index("ix_user_pages_user_id", "user_pages", ["user_id"], unique=False)
    op.create_index("ix_user_pages_user_menu_order", "user_pages", ["user_id", "menu_order"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_pages_user_menu_order", table_name="user_pages")
    op.drop_index("ix_user_pages_user_id", table_name="user_pages")
    op.drop_table("user_pages")

    op.drop_column("users", "nav_menu_enabled")
    op.drop_column("users", "nav_blog_name")
    op.drop_column("users", "navbar_enabled")
