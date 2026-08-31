"""drop email_logs and blog notify_subscribers

Removes the newsletter / post email broadcast feature:
- email_logs table and email_log_status enum
- blogs.notify_subscribers column

Subscribers collection is retained for audience capture and ESP integration.

Revision ID: c8d9e0f1a2b3
Revises: u7v8w9x0y1z2
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "u7v8w9x0y1z2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    if conn.execute(sa.text("SELECT to_regclass('email_logs')")).scalar():
        op.drop_table("email_logs")

    op.execute("DROP TYPE IF EXISTS email_log_status")

    op.execute("ALTER TABLE blogs DROP COLUMN IF EXISTS notify_subscribers")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE blogs ADD COLUMN IF NOT EXISTS notify_subscribers BOOLEAN "
        "NOT NULL DEFAULT false"
    )

    op.execute("CREATE TYPE email_log_status AS ENUM ('pending', 'sent', 'failed')")

    op.create_table(
        "email_logs",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("blog_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_recipients", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status",
            postgresql.ENUM("pending", "sent", "failed", name="email_log_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("log_id"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.site_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blog_id"], ["blogs.blog_id"], ondelete="CASCADE"),
        sa.UniqueConstraint("site_id", "blog_id", name="uq_email_logs_site_blog"),
        sa.CheckConstraint("total_recipients >= 0", name="ck_email_logs_recipients_nonneg"),
    )
    op.create_index("ix_email_logs_site_id", "email_logs", ["site_id"])
    op.create_index("ix_email_logs_blog_id", "email_logs", ["blog_id"])
