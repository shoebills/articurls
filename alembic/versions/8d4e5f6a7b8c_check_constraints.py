"""add check constraints for amounts, sizes, and period ordering

Revision ID: 8d4e5f6a7b8c
Revises: 7c3d4e5f6a7b
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8d4e5f6a7b8c"
down_revision: Union[str, Sequence[str], None] = "7c3d4e5f6a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_transactions_amount_nonneg", "transactions", "amount >= 0"
    )
    op.create_check_constraint(
        "ck_blog_medias_size_nonneg", "blog_medias", "size_bytes >= 0"
    )
    op.create_check_constraint(
        "ck_page_medias_size_nonneg", "page_medias", "size_bytes >= 0"
    )
    op.create_check_constraint(
        "ck_email_logs_recipients_nonneg", "email_logs", "total_recipients >= 0"
    )
    op.create_check_constraint(
        "ck_subscriptions_period_order",
        "subscriptions",
        "current_period_end IS NULL OR current_period_start IS NULL OR current_period_end >= current_period_start",
    )
    op.create_check_constraint(
        "ck_subscribers_unsub_after_sub",
        "subscribers",
        "unsubscribed_at IS NULL OR subscribed_at IS NULL OR unsubscribed_at >= subscribed_at",
    )


def downgrade() -> None:
    op.drop_constraint("ck_subscribers_unsub_after_sub", "subscribers", type_="check")
    op.drop_constraint("ck_subscriptions_period_order", "subscriptions", type_="check")
    op.drop_constraint("ck_email_logs_recipients_nonneg", "email_logs", type_="check")
    op.drop_constraint("ck_page_medias_size_nonneg", "page_medias", type_="check")
    op.drop_constraint("ck_blog_medias_size_nonneg", "blog_medias", type_="check")
    op.drop_constraint("ck_transactions_amount_nonneg", "transactions", type_="check")