"""add page_medias table

Revision ID: t1u2v3w4x5y6
Revises: s9t0u1v2w3x4
Create Date: 2026-05-14

"""
from alembic import op
import sqlalchemy as sa


revision = "t1u2v3w4x5y6"
down_revision = "s9t0u1v2w3x4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "page_medias",
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("page_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["page_id"], ["user_pages.page_id"], ),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ),
        sa.PrimaryKeyConstraint("media_id"),
    )
    op.create_index(op.f("ix_page_medias_page_id"), "page_medias", ["page_id"], unique=False)
    op.create_index(op.f("ix_page_medias_user_id"), "page_medias", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_page_medias_user_id"), table_name="page_medias")
    op.drop_index(op.f("ix_page_medias_page_id"), table_name="page_medias")
    op.drop_table("page_medias")
