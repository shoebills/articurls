"""drop username rename machinery

Subdomains are permanent (chosen once at site creation). This removes the
rename support artifacts:

- username_claims      — redundant copy of sites.subdomain; uniqueness is
                         enforced by the sites.subdomain unique constraint.
- username_change_audits — rename audit trail; renames no longer exist.
- sites.last_username_change_at — tracked the 7-day rename cooldown.

Revision ID: u7v8w9x0y1z2
Revises: 0f6a7b8c9d0e
Create Date: 2026-08-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "u7v8w9x0y1z2"
down_revision: Union[str, Sequence[str], None] = "0f6a7b8c9d0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    if conn.execute(sa.text("SELECT to_regclass('username_change_audits')")).scalar():
        op.drop_table("username_change_audits")

    if conn.execute(sa.text("SELECT to_regclass('username_claims')")).scalar():
        op.drop_table("username_claims")

    op.execute("ALTER TABLE sites DROP COLUMN IF EXISTS last_username_change_at")


def downgrade() -> None:
    op.add_column("sites", sa.Column("last_username_change_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "username_claims",
        sa.Column("claim_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("claim_id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_username_claims_user_id", "username_claims", ["user_id"], unique=False)
    op.create_index("ix_username_claims_username", "username_claims", ["username"], unique=False)

    op.create_table(
        "username_change_audits",
        sa.Column("audit_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("old_username", sa.String(), nullable=False),
        sa.Column("new_username", sa.String(), nullable=False),
        sa.Column("actor_user_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_email", sa.String(), nullable=True),
        sa.Column("is_admin_override", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("request_ip", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("audit_id"),
    )
    op.create_index("ix_username_change_audits_user_id", "username_change_audits", ["user_id"], unique=False)
    op.create_index("ix_username_change_audits_actor_user_id", "username_change_audits", ["actor_user_id"], unique=False)