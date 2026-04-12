"""major models change

Revision ID: 5d5086c2114f
Revises: 484ff2aec353
Create Date: 2026-04-12 20:05:41.604493
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5d5086c2114f"
down_revision: Union[str, Sequence[str], None] = "484ff2aec353"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "blogs",
        "content",
        existing_type=sa.VARCHAR(),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.create_index("ix_blogs_status_scheduled_at", "blogs", ["status", "scheduled_at"], unique=False)
    op.create_unique_constraint("uq_blogs_user_slug", "blogs", ["user_id", "slug"])
    op.create_unique_constraint("uq_email_logs_user_blog", "email_logs", ["user_id", "blog_id"])

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.alter_column(
            "payment_webhooks",
            "payload",
            existing_type=sa.VARCHAR(),
            type_=sa.JSON(),
            postgresql_using="payload::json",
            existing_nullable=False,
        )
    else:
        op.alter_column(
            "payment_webhooks",
            "payload",
            existing_type=sa.VARCHAR(),
            type_=sa.JSON(),
            existing_nullable=False,
        )

    op.create_unique_constraint("uq_subscribers_user_email", "subscribers", ["user_id", "email"])
    op.create_index("ix_views_blog_visitor_hash", "views", ["blog_id", "visitor_hash"], unique=False)
    op.create_index("ix_views_user_visited_at", "views", ["user_id", "visited_at"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_views_user_visited_at", table_name="views")
    op.drop_index("ix_views_blog_visitor_hash", table_name="views")
    op.drop_constraint("uq_subscribers_user_email", "subscribers", type_="unique")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.alter_column(
            "payment_webhooks",
            "payload",
            existing_type=sa.JSON(),
            type_=sa.VARCHAR(),
            postgresql_using="payload::text",
            existing_nullable=False,
        )
    else:
        op.alter_column(
            "payment_webhooks",
            "payload",
            existing_type=sa.JSON(),
            type_=sa.VARCHAR(),
            existing_nullable=False,
        )

    op.drop_constraint("uq_email_logs_user_blog", "email_logs", type_="unique")
    op.drop_constraint("uq_blogs_user_slug", "blogs", type_="unique")
    op.drop_index("ix_blogs_status_scheduled_at", table_name="blogs")
    op.alter_column(
        "blogs",
        "content",
        existing_type=sa.Text(),
        type_=sa.VARCHAR(),
        existing_nullable=False,
    )
