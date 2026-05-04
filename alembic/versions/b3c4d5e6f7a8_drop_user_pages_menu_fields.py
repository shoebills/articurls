"""drop_user_pages_menu_fields

Pages are only shown in the site footer, not in the nav menu.
Remove show_in_menu, menu_order, and the associated index from user_pages.

Categories retain their show_in_menu / menu_order columns — those are
used for the nav menu and are unaffected by this migration.

Revision ID: b3c4d5e6f7a8
Revises: c1d2e3f4a5b6
Create Date: 2026-05-04

"""
from alembic import op
import sqlalchemy as sa

revision = "b3c4d5e6f7a8"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_user_pages_user_menu_order", table_name="user_pages")
    op.drop_column("user_pages", "show_in_menu")
    op.drop_column("user_pages", "menu_order")


def downgrade() -> None:
    op.add_column(
        "user_pages",
        sa.Column(
            "menu_order",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.add_column(
        "user_pages",
        sa.Column(
            "show_in_menu",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_user_pages_user_menu_order",
        "user_pages",
        ["user_id", "menu_order"],
        unique=False,
    )
