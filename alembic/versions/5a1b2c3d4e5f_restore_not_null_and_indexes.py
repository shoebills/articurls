"""restore not null constraints and indexes lost in the uuidv7 migration

The uuidv7 migration (a1b2c3d4e5f0) re-added all FK columns without NOT NULL
and only recreated a subset of indexes. Restore them to match the models.

Revision ID: 5a1b2c3d4e5f
Revises: 4f0a1b2c3d4e
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5a1b2c3d4e5f"
down_revision: Union[str, Sequence[str], None] = "4f0a1b2c3d4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sites ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE authors ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE blogs ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE blog_medias ALTER COLUMN blog_id SET NOT NULL;
        ALTER TABLE blog_medias ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE user_pages ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE page_medias ALTER COLUMN page_id SET NOT NULL;
        ALTER TABLE page_medias ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE categories ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE blog_categories ALTER COLUMN blog_id SET NOT NULL;
        ALTER TABLE blog_categories ALTER COLUMN category_id SET NOT NULL;
        ALTER TABLE subscribers ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE email_logs ALTER COLUMN site_id SET NOT NULL;
        ALTER TABLE email_logs ALTER COLUMN blog_id SET NOT NULL;
        ALTER TABLE subscriptions ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE username_claims ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE username_change_audits ALTER COLUMN user_id SET NOT NULL;
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_blogs_author_id ON blogs (author_id);
        CREATE INDEX IF NOT EXISTS ix_blog_medias_blog_id ON blog_medias (blog_id);
        CREATE INDEX IF NOT EXISTS ix_blog_medias_site_id ON blog_medias (site_id);
        CREATE INDEX IF NOT EXISTS ix_page_medias_page_id ON page_medias (page_id);
        CREATE INDEX IF NOT EXISTS ix_page_medias_site_id ON page_medias (site_id);
        CREATE INDEX IF NOT EXISTS ix_blog_categories_blog_id ON blog_categories (blog_id);
        CREATE INDEX IF NOT EXISTS ix_blog_categories_category_id ON blog_categories (category_id);
        CREATE INDEX IF NOT EXISTS ix_subscribers_site_id ON subscribers (site_id);
        CREATE INDEX IF NOT EXISTS ix_email_logs_site_id ON email_logs (site_id);
        CREATE INDEX IF NOT EXISTS ix_email_logs_blog_id ON email_logs (blog_id);
        CREATE INDEX IF NOT EXISTS ix_transactions_user_id ON transactions (user_id);
        CREATE INDEX IF NOT EXISTS ix_username_claims_user_id ON username_claims (user_id);
        CREATE INDEX IF NOT EXISTS ix_username_change_audits_user_id ON username_change_audits (user_id);
        CREATE INDEX IF NOT EXISTS ix_username_change_audits_actor_user_id ON username_change_audits (actor_user_id);
    """)

    # The models declare unique=True + index=True on these columns, which
    # SQLAlchemy materializes as unique indexes. Replace the legacy unique
    # constraints with matching unique indexes.
    op.execute("""
        ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS uq_subscriptions_user_id;
        CREATE UNIQUE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions (user_id);

        ALTER TABLE username_claims DROP CONSTRAINT IF EXISTS username_claims_username_key;
        DROP INDEX IF EXISTS ix_username_claims_username;
        CREATE UNIQUE INDEX IF NOT EXISTS ix_username_claims_username ON username_claims (username);
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ix_subscriptions_user_id;
        ALTER TABLE subscriptions ADD CONSTRAINT uq_subscriptions_user_id UNIQUE (user_id);

        DROP INDEX IF EXISTS ix_username_claims_username;
        CREATE INDEX IF NOT EXISTS ix_username_claims_username ON username_claims (username);
        ALTER TABLE username_claims ADD CONSTRAINT username_claims_username_key UNIQUE (username);
    """)