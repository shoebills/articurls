"""add subscription billing cycle and pending change columns

Revision ID: c8d7e6f5a4b3
Revises: j9k8l7m6n5o4
Create Date: 2026-10-18

"""
from typing import Sequence, Union

from alembic import op


revision: str = "c8d7e6f5a4b3"
down_revision: Union[str, Sequence[str], None] = "j9k8l7m6n5o4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE subscription_billing_cycle AS ENUM ('monthly', 'yearly')")
    op.execute("ALTER TABLE subscriptions ADD COLUMN billing_cycle subscription_billing_cycle")
    op.execute("ALTER TABLE subscriptions ADD COLUMN pending_tier varchar")
    op.execute("ALTER TABLE subscriptions ADD COLUMN pending_billing_cycle subscription_billing_cycle")
    op.execute("UPDATE subscriptions SET billing_cycle = 'monthly' WHERE plan_type = 'pro'")


def downgrade() -> None:
    op.execute("ALTER TABLE subscriptions DROP COLUMN pending_billing_cycle")
    op.execute("ALTER TABLE subscriptions DROP COLUMN pending_tier")
    op.execute("ALTER TABLE subscriptions DROP COLUMN billing_cycle")
    op.execute("DROP TYPE subscription_billing_cycle")