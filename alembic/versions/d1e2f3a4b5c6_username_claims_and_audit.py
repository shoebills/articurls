"""add username claims and rename audit tables

Revision ID: d1e2f3a4b5c6
Revises: c3d4e5f6a7b8
Create Date: 2026-04-25 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username_change_count", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "username_claims",
        sa.Column("claim_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("claim_id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_username_claims_user_id", "username_claims", ["user_id"], unique=False)
    op.create_index("ix_username_claims_username", "username_claims", ["username"], unique=False)

    op.create_table(
        "username_change_audits",
        sa.Column("audit_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("old_username", sa.String(), nullable=False),
        sa.Column("new_username", sa.String(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("actor_email", sa.String(), nullable=True),
        sa.Column("is_admin_override", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("request_ip", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("audit_id"),
    )
    op.create_index("ix_username_change_audits_user_id", "username_change_audits", ["user_id"], unique=False)
    op.create_index("ix_username_change_audits_actor_user_id", "username_change_audits", ["actor_user_id"], unique=False)

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            INSERT INTO username_claims (user_id, username)
            SELECT user_id, lower(trim(user_name))
            FROM users
            WHERE user_name IS NOT NULL AND trim(user_name) <> ''
            ON CONFLICT (username) DO NOTHING
            """
        )
    )
    op.alter_column("users", "username_change_count", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_username_change_audits_actor_user_id", table_name="username_change_audits")
    op.drop_index("ix_username_change_audits_user_id", table_name="username_change_audits")
    op.drop_table("username_change_audits")

    op.drop_index("ix_username_claims_username", table_name="username_claims")
    op.drop_index("ix_username_claims_user_id", table_name="username_claims")
    op.drop_table("username_claims")

    op.drop_column("users", "username_change_count")
