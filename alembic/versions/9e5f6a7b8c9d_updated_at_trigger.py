"""add updated_at trigger to all tables with an updated_at column

Keeps updated_at correct even for raw SQL / bulk updates that bypass the
ORM onupdate hook.

Revision ID: 9e5f6a7b8c9d
Revises: 8d4e5f6a7b8c
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9e5f6a7b8c9d"
down_revision: Union[str, Sequence[str], None] = "8d4e5f6a7b8c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TRIGGER_TABLES = ("users", "sites", "authors", "blogs", "user_pages", "subscriptions")


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    for table in _TRIGGER_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")
        op.execute(
            f"CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table} "
            f"FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
        )


def downgrade() -> None:
    for table in _TRIGGER_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")