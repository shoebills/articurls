"""domain_status enum type

Revision ID: b1c2d3e4f5a6
Revises: a9b8c7d6e5f4
Create Date: 2026-05-03

Converts domain_status from plain VARCHAR to a proper PostgreSQL enum type
with a check constraint, preventing invalid values at the DB level.
"""
from alembic import op
import sqlalchemy as sa

revision = 'b1c2d3e4f5a6'
down_revision = 'a9b8c7d6e5f4'
branch_labels = None
depends_on = None

_VALID = ('none', 'pending', 'active', 'grace', 'expired')


def upgrade() -> None:
    # Create the enum type
    op.execute("CREATE TYPE domain_status_enum AS ENUM ('none', 'pending', 'active', 'grace', 'expired');")

    # Cast the existing column to the new type
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN domain_status TYPE domain_status_enum
        USING domain_status::domain_status_enum;
    """)

    # Set the default using the enum type
    op.execute("ALTER TABLE users ALTER COLUMN domain_status SET DEFAULT 'none'::domain_status_enum;")


def downgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN domain_status TYPE VARCHAR USING domain_status::VARCHAR;")
    op.execute("ALTER TABLE users ALTER COLUMN domain_status SET DEFAULT 'none';")
    op.execute("DROP TYPE IF EXISTS domain_status_enum;")
