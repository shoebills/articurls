"""remove account trial: drop trial plan_type value and warning_stage

Revision ID: d9e8f7a6b5c4
Revises: c8d7e6f5a4b3
Create Date: 2026-10-18
"""
from typing import Sequence, Union

from alembic import op


revision: str = "d9e8f7a6b5c4"
down_revision: Union[str, Sequence[str], None] = "c8d7e6f5a4b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Legacy account-trial rows carry no value (dev-phase); remove them before
    # the enum loses the 'trial' value.
    op.execute("DELETE FROM subscriptions WHERE plan_type = 'trial'")

    op.execute("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS ck_subscriptions_warning_stage_range")
    op.execute("ALTER TABLE subscriptions DROP COLUMN IF EXISTS warning_stage")

    op.execute("ALTER TYPE subscription_plan_type RENAME TO subscription_plan_type_old")
    op.execute("CREATE TYPE subscription_plan_type AS ENUM ('pro', 'lifetime')")
    op.execute(
        "ALTER TABLE subscriptions ALTER COLUMN plan_type TYPE subscription_plan_type "
        "USING plan_type::text::subscription_plan_type"
    )
    op.execute("DROP TYPE subscription_plan_type_old")


def downgrade() -> None:
    op.execute("ALTER TYPE subscription_plan_type RENAME TO subscription_plan_type_old")
    op.execute("CREATE TYPE subscription_plan_type AS ENUM ('trial', 'pro', 'lifetime')")
    op.execute(
        "ALTER TABLE subscriptions ALTER COLUMN plan_type TYPE subscription_plan_type "
        "USING plan_type::text::subscription_plan_type"
    )
    op.execute("DROP TYPE subscription_plan_type_old")

    op.execute(
        "ALTER TABLE subscriptions ADD COLUMN warning_stage integer NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE subscriptions ADD CONSTRAINT ck_subscriptions_warning_stage_range "
        "CHECK (warning_stage >= 0 AND warning_stage <= 3)"
    )