"""add redirects table

Per-site path redirects: source_path -> target_url with a redirect type
(permanent -> 301, temporary -> 302). Checked before content resolution.

Revision ID: g0h1i2j3k4l5
Revises: f9g0h1i2j3k4l
Create Date: 2026-10-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "g0h1i2j3k4l5"
down_revision: Union[str, Sequence[str], None] = "f9g0h1i2j3k4l"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE redirect_type AS ENUM ('permanent', 'temporary')")
    op.create_table(
        "redirects",
        sa.Column("redirect_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("site_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("source_path", sa.String(length=300), nullable=False),
        sa.Column("target_url", sa.String(length=2000), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(name="redirect_type", create_type=False),
            nullable=False,
            server_default="permanent",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["site_id"], ["sites.site_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("redirect_id"),
        sa.UniqueConstraint("site_id", "source_path", name="uq_redirects_site_source_path"),
        sa.CheckConstraint("source_path <> target_url", name="ck_redirects_no_self_loop"),
        sa.CheckConstraint("source_path LIKE '/%'", name="ck_redirects_source_slash"),
    )
    op.execute(
        "CREATE TRIGGER trg_redirects_updated_at BEFORE UPDATE ON redirects "
        "FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_redirects_updated_at ON redirects")
    op.drop_table("redirects")
    op.execute("DROP TYPE redirect_type")
