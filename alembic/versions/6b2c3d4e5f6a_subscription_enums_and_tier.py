"""convert subscriptions plan_type/status to enums and add tier column

- plan_type: trial | pro | lifetime (state 'lapsed' moves to status)
- status: active | inactive | cancelled | past_due | lapsed
- tier: stores the Dodo plan/product key (e.g. 'pro_100k') so usage limits
  can be priced per tier instead of collapsing every Pro user to one tier.

Revision ID: 6b2c3d4e5f6a
Revises: 5a1b2c3d4e5f
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6b2c3d4e5f6a"
down_revision: Union[str, Sequence[str], None] = "5a1b2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 'lapsed' was smuggled into plan_type; move it to status before casting.
    op.execute("""
        UPDATE subscriptions
        SET plan_type = 'pro', status = 'lapsed'
        WHERE plan_type = 'lapsed'
    """)

    op.execute("CREATE TYPE subscription_plan_type AS ENUM ('trial', 'pro', 'lifetime')")
    op.execute(
        "CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due', 'lapsed')"
    )
    op.execute(
        "ALTER TABLE subscriptions ALTER COLUMN plan_type TYPE subscription_plan_type "
        "USING plan_type::text::subscription_plan_type"
    )
    op.execute(
        "ALTER TABLE subscriptions ALTER COLUMN status TYPE subscription_status "
        "USING status::text::subscription_status"
    )

    op.add_column("subscriptions", sa.Column("tier", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("subscriptions", "tier")
    op.execute(
        "ALTER TABLE subscriptions ALTER COLUMN plan_type TYPE varchar "
        "USING plan_type::text"
    )
    op.execute(
        "ALTER TABLE subscriptions ALTER COLUMN status TYPE varchar "
        "USING status::text"
    )
    op.execute("DROP TYPE subscription_status")
    op.execute("DROP TYPE subscription_plan_type")