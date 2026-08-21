"""migrate all entity and foreign key ids to uuidv7

Revision ID: a1b2c3d4e5f0
Revises: f6e5d4c3b2a1
Create Date: 2026-08-21 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f0'
down_revision: Union[str, Sequence[str], None] = 'f6e5d4c3b2a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure pgcrypto extension is present for UUID generation
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    # 2. Add temporary new UUID columns with default gen_random_uuid()
    op.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS new_user_id UUID DEFAULT gen_random_uuid();

        ALTER TABLE sites ADD COLUMN IF NOT EXISTS new_site_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE sites ADD COLUMN IF NOT EXISTS new_user_id UUID;

        ALTER TABLE authors ADD COLUMN IF NOT EXISTS new_author_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE authors ADD COLUMN IF NOT EXISTS new_site_id UUID;

        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS new_blog_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS new_site_id UUID;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS new_author_id UUID;

        ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS new_page_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE user_pages ADD COLUMN IF NOT EXISTS new_site_id UUID;

        ALTER TABLE categories ADD COLUMN IF NOT EXISTS new_category_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS new_site_id UUID;

        ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS new_blog_category_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS new_blog_id UUID;
        ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS new_category_id UUID;

        ALTER TABLE blog_medias ADD COLUMN IF NOT EXISTS new_media_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE blog_medias ADD COLUMN IF NOT EXISTS new_blog_id UUID;
        ALTER TABLE blog_medias ADD COLUMN IF NOT EXISTS new_site_id UUID;

        ALTER TABLE page_medias ADD COLUMN IF NOT EXISTS new_media_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE page_medias ADD COLUMN IF NOT EXISTS new_page_id UUID;
        ALTER TABLE page_medias ADD COLUMN IF NOT EXISTS new_site_id UUID;

        ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS new_subscriber_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS new_site_id UUID;

        ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS new_subscription_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS new_user_id UUID;

        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_transaction_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_user_id UUID;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_subscription_id UUID;

        ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS new_webhook_id UUID DEFAULT gen_random_uuid();

        ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS new_log_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS new_site_id UUID;
        ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS new_blog_id UUID;

        ALTER TABLE username_claims ADD COLUMN IF NOT EXISTS new_claim_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE username_claims ADD COLUMN IF NOT EXISTS new_user_id UUID;

        ALTER TABLE username_change_audits ADD COLUMN IF NOT EXISTS new_audit_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE username_change_audits ADD COLUMN IF NOT EXISTS new_user_id UUID;
        ALTER TABLE username_change_audits ADD COLUMN IF NOT EXISTS new_actor_user_id UUID;

        ALTER TABLE views ADD COLUMN IF NOT EXISTS new_view_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE views ADD COLUMN IF NOT EXISTS new_site_id UUID;
        ALTER TABLE views ADD COLUMN IF NOT EXISTS new_blog_id UUID;
    """)

    # 3. Backfill Foreign Key UUID values by matching integer IDs
    op.execute("""
        UPDATE sites SET new_user_id = u.new_user_id FROM users u WHERE sites.user_id = u.user_id;
        UPDATE authors SET new_site_id = s.new_site_id FROM sites s WHERE authors.site_id = s.site_id;
        UPDATE blogs SET new_site_id = s.new_site_id FROM sites s WHERE blogs.site_id = s.site_id;
        UPDATE blogs SET new_author_id = a.new_author_id FROM authors a WHERE blogs.author_id = a.author_id;
        UPDATE user_pages SET new_site_id = s.new_site_id FROM sites s WHERE user_pages.site_id = s.site_id;
        UPDATE categories SET new_site_id = s.new_site_id FROM sites s WHERE categories.site_id = s.site_id;

        UPDATE blog_categories SET new_blog_id = b.new_blog_id FROM blogs b WHERE blog_categories.blog_id = b.blog_id;
        UPDATE blog_categories SET new_category_id = c.new_category_id FROM categories c WHERE blog_categories.category_id = c.category_id;

        UPDATE blog_medias SET new_blog_id = b.new_blog_id FROM blogs b WHERE blog_medias.blog_id = b.blog_id;
        UPDATE blog_medias SET new_site_id = s.new_site_id FROM sites s WHERE blog_medias.site_id = s.site_id;

        UPDATE page_medias SET new_page_id = p.new_page_id FROM user_pages p WHERE page_medias.page_id = p.page_id;
        UPDATE page_medias SET new_site_id = s.new_site_id FROM sites s WHERE page_medias.site_id = s.site_id;

        UPDATE subscribers SET new_site_id = s.new_site_id FROM sites s WHERE subscribers.site_id = s.site_id;
        UPDATE subscriptions SET new_user_id = u.new_user_id FROM users u WHERE subscriptions.user_id = u.user_id;

        UPDATE transactions SET new_user_id = u.new_user_id FROM users u WHERE transactions.user_id = u.user_id;
        UPDATE transactions SET new_subscription_id = sub.new_subscription_id FROM subscriptions sub WHERE transactions.subscription_id = sub.subscription_id;

        UPDATE email_logs SET new_site_id = s.new_site_id FROM sites s WHERE email_logs.site_id = s.site_id;
        UPDATE email_logs SET new_blog_id = b.new_blog_id FROM blogs b WHERE email_logs.blog_id = b.blog_id;

        UPDATE username_claims SET new_user_id = u.new_user_id FROM users u WHERE username_claims.user_id = u.user_id;
        UPDATE username_change_audits SET new_user_id = u.new_user_id FROM users u WHERE username_change_audits.user_id = u.user_id;
        UPDATE username_change_audits SET new_actor_user_id = u.new_user_id FROM users u WHERE username_change_audits.actor_user_id = u.user_id;

        UPDATE views SET new_site_id = s.new_site_id FROM sites s WHERE views.site_id = s.site_id;
        UPDATE views SET new_blog_id = b.new_blog_id FROM blogs b WHERE views.blog_id = b.blog_id;
    """)

    # 4. Drop existing constraints
    op.execute("""
        ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_user_id_fkey;
        ALTER TABLE authors DROP CONSTRAINT IF EXISTS authors_site_id_fkey;
        ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_site_id_fkey;
        ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_author_id_fkey;
        ALTER TABLE user_pages DROP CONSTRAINT IF EXISTS user_pages_site_id_fkey;
        ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_site_id_fkey;
        ALTER TABLE blog_categories DROP CONSTRAINT IF EXISTS blog_categories_blog_id_fkey;
        ALTER TABLE blog_categories DROP CONSTRAINT IF EXISTS blog_categories_category_id_fkey;
        ALTER TABLE blog_medias DROP CONSTRAINT IF EXISTS blog_medias_blog_id_fkey;
        ALTER TABLE blog_medias DROP CONSTRAINT IF EXISTS blog_medias_site_id_fkey;
        ALTER TABLE page_medias DROP CONSTRAINT IF EXISTS page_medias_page_id_fkey;
        ALTER TABLE page_medias DROP CONSTRAINT IF EXISTS page_medias_site_id_fkey;
        ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_site_id_fkey;
        ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_subscription_id_fkey;
        ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_site_id_fkey;
        ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_blog_id_fkey;
        ALTER TABLE username_claims DROP CONSTRAINT IF EXISTS username_claims_user_id_fkey;
        ALTER TABLE username_change_audits DROP CONSTRAINT IF EXISTS username_change_audits_user_id_fkey;
        ALTER TABLE username_change_audits DROP CONSTRAINT IF EXISTS username_change_audits_actor_user_id_fkey;
        ALTER TABLE views DROP CONSTRAINT IF EXISTS views_site_id_fkey;
        ALTER TABLE views DROP CONSTRAINT IF EXISTS views_blog_id_fkey;

        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
        ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_pkey CASCADE;
        ALTER TABLE authors DROP CONSTRAINT IF EXISTS authors_pkey CASCADE;
        ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_pkey CASCADE;
        ALTER TABLE user_pages DROP CONSTRAINT IF EXISTS user_pages_pkey CASCADE;
        ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_pkey CASCADE;
        ALTER TABLE blog_categories DROP CONSTRAINT IF EXISTS blog_categories_pkey CASCADE;
        ALTER TABLE blog_medias DROP CONSTRAINT IF EXISTS blog_medias_pkey CASCADE;
        ALTER TABLE page_medias DROP CONSTRAINT IF EXISTS page_medias_pkey CASCADE;
        ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_pkey CASCADE;
        ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey CASCADE;
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey CASCADE;
        ALTER TABLE payment_webhooks DROP CONSTRAINT IF EXISTS payment_webhooks_pkey CASCADE;
        ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_pkey CASCADE;
        ALTER TABLE username_claims DROP CONSTRAINT IF EXISTS username_claims_pkey CASCADE;
        ALTER TABLE username_change_audits DROP CONSTRAINT IF EXISTS username_change_audits_pkey CASCADE;
        ALTER TABLE views DROP CONSTRAINT IF EXISTS views_pkey CASCADE;
    """)

    # 5. Swap columns to new UUIDs
    op.execute("""
        ALTER TABLE users DROP COLUMN IF EXISTS user_id;
        ALTER TABLE users RENAME COLUMN new_user_id TO user_id;
        ALTER TABLE users ADD PRIMARY KEY (user_id);

        ALTER TABLE sites DROP COLUMN IF EXISTS site_id;
        ALTER TABLE sites DROP COLUMN IF EXISTS user_id;
        ALTER TABLE sites RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE sites RENAME COLUMN new_user_id TO user_id;
        ALTER TABLE sites ADD PRIMARY KEY (site_id);

        ALTER TABLE authors DROP COLUMN IF EXISTS author_id;
        ALTER TABLE authors DROP COLUMN IF EXISTS site_id;
        ALTER TABLE authors RENAME COLUMN new_author_id TO author_id;
        ALTER TABLE authors RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE authors ADD PRIMARY KEY (author_id);

        ALTER TABLE blogs DROP COLUMN IF EXISTS blog_id;
        ALTER TABLE blogs DROP COLUMN IF EXISTS site_id;
        ALTER TABLE blogs DROP COLUMN IF EXISTS author_id;
        ALTER TABLE blogs RENAME COLUMN new_blog_id TO blog_id;
        ALTER TABLE blogs RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE blogs RENAME COLUMN new_author_id TO author_id;
        ALTER TABLE blogs ADD PRIMARY KEY (blog_id);

        ALTER TABLE user_pages DROP COLUMN IF EXISTS page_id;
        ALTER TABLE user_pages DROP COLUMN IF EXISTS site_id;
        ALTER TABLE user_pages RENAME COLUMN new_page_id TO page_id;
        ALTER TABLE user_pages RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE user_pages ADD PRIMARY KEY (page_id);

        ALTER TABLE categories DROP COLUMN IF EXISTS category_id;
        ALTER TABLE categories DROP COLUMN IF EXISTS site_id;
        ALTER TABLE categories RENAME COLUMN new_category_id TO category_id;
        ALTER TABLE categories RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE categories ADD PRIMARY KEY (category_id);

        ALTER TABLE blog_categories DROP COLUMN IF EXISTS blog_category_id;
        ALTER TABLE blog_categories DROP COLUMN IF EXISTS blog_id;
        ALTER TABLE blog_categories DROP COLUMN IF EXISTS category_id;
        ALTER TABLE blog_categories RENAME COLUMN new_blog_category_id TO blog_category_id;
        ALTER TABLE blog_categories RENAME COLUMN new_blog_id TO blog_id;
        ALTER TABLE blog_categories RENAME COLUMN new_category_id TO category_id;
        ALTER TABLE blog_categories ADD PRIMARY KEY (blog_category_id);

        ALTER TABLE blog_medias DROP COLUMN IF EXISTS media_id;
        ALTER TABLE blog_medias DROP COLUMN IF EXISTS blog_id;
        ALTER TABLE blog_medias DROP COLUMN IF EXISTS site_id;
        ALTER TABLE blog_medias RENAME COLUMN new_media_id TO media_id;
        ALTER TABLE blog_medias RENAME COLUMN new_blog_id TO blog_id;
        ALTER TABLE blog_medias RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE blog_medias ADD PRIMARY KEY (media_id);

        ALTER TABLE page_medias DROP COLUMN IF EXISTS media_id;
        ALTER TABLE page_medias DROP COLUMN IF EXISTS page_id;
        ALTER TABLE page_medias DROP COLUMN IF EXISTS site_id;
        ALTER TABLE page_medias RENAME COLUMN new_media_id TO media_id;
        ALTER TABLE page_medias RENAME COLUMN new_page_id TO page_id;
        ALTER TABLE page_medias RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE page_medias ADD PRIMARY KEY (media_id);

        ALTER TABLE subscribers DROP COLUMN IF EXISTS subscriber_id;
        ALTER TABLE subscribers DROP COLUMN IF EXISTS site_id;
        ALTER TABLE subscribers RENAME COLUMN new_subscriber_id TO subscriber_id;
        ALTER TABLE subscribers RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE subscribers ADD PRIMARY KEY (subscriber_id);

        ALTER TABLE subscriptions DROP COLUMN IF EXISTS subscription_id;
        ALTER TABLE subscriptions DROP COLUMN IF EXISTS user_id;
        ALTER TABLE subscriptions RENAME COLUMN new_subscription_id TO subscription_id;
        ALTER TABLE subscriptions RENAME COLUMN new_user_id TO user_id;
        ALTER TABLE subscriptions ADD PRIMARY KEY (subscription_id);

        ALTER TABLE transactions DROP COLUMN IF EXISTS transaction_id;
        ALTER TABLE transactions DROP COLUMN IF EXISTS user_id;
        ALTER TABLE transactions DROP COLUMN IF EXISTS subscription_id;
        ALTER TABLE transactions RENAME COLUMN new_transaction_id TO transaction_id;
        ALTER TABLE transactions RENAME COLUMN new_user_id TO user_id;
        ALTER TABLE transactions RENAME COLUMN new_subscription_id TO subscription_id;
        ALTER TABLE transactions ADD PRIMARY KEY (transaction_id);

        ALTER TABLE payment_webhooks DROP COLUMN IF EXISTS webhook_id;
        ALTER TABLE payment_webhooks RENAME COLUMN new_webhook_id TO webhook_id;
        ALTER TABLE payment_webhooks ADD PRIMARY KEY (webhook_id);

        ALTER TABLE email_logs DROP COLUMN IF EXISTS log_id;
        ALTER TABLE email_logs DROP COLUMN IF EXISTS site_id;
        ALTER TABLE email_logs DROP COLUMN IF EXISTS blog_id;
        ALTER TABLE email_logs RENAME COLUMN new_log_id TO log_id;
        ALTER TABLE email_logs RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE email_logs RENAME COLUMN new_blog_id TO blog_id;
        ALTER TABLE email_logs ADD PRIMARY KEY (log_id);

        ALTER TABLE username_claims DROP COLUMN IF EXISTS claim_id;
        ALTER TABLE username_claims DROP COLUMN IF EXISTS user_id;
        ALTER TABLE username_claims RENAME COLUMN new_claim_id TO claim_id;
        ALTER TABLE username_claims RENAME COLUMN new_user_id TO user_id;
        ALTER TABLE username_claims ADD PRIMARY KEY (claim_id);

        ALTER TABLE username_change_audits DROP COLUMN IF EXISTS audit_id;
        ALTER TABLE username_change_audits DROP COLUMN IF EXISTS user_id;
        ALTER TABLE username_change_audits DROP COLUMN IF EXISTS actor_user_id;
        ALTER TABLE username_change_audits RENAME COLUMN new_audit_id TO audit_id;
        ALTER TABLE username_change_audits RENAME COLUMN new_user_id TO user_id;
        ALTER TABLE username_change_audits RENAME COLUMN new_actor_user_id TO actor_user_id;
        ALTER TABLE username_change_audits ADD PRIMARY KEY (audit_id);

        ALTER TABLE views DROP COLUMN IF EXISTS view_id;
        ALTER TABLE views DROP COLUMN IF EXISTS site_id;
        ALTER TABLE views DROP COLUMN IF EXISTS blog_id;
        ALTER TABLE views RENAME COLUMN new_view_id TO view_id;
        ALTER TABLE views RENAME COLUMN new_site_id TO site_id;
        ALTER TABLE views RENAME COLUMN new_blog_id TO blog_id;
        ALTER TABLE views ADD PRIMARY KEY (view_id);
    """)

    # 6. Recreate foreign key constraints
    op.execute("""
        ALTER TABLE sites ADD CONSTRAINT sites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
        ALTER TABLE authors ADD CONSTRAINT authors_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE blogs ADD CONSTRAINT blogs_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE blogs ADD CONSTRAINT blogs_author_id_fkey FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE SET NULL;
        ALTER TABLE user_pages ADD CONSTRAINT user_pages_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE categories ADD CONSTRAINT categories_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE blog_categories ADD CONSTRAINT blog_categories_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES blogs(blog_id) ON DELETE CASCADE;
        ALTER TABLE blog_categories ADD CONSTRAINT blog_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE;
        ALTER TABLE blog_medias ADD CONSTRAINT blog_medias_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES blogs(blog_id) ON DELETE CASCADE;
        ALTER TABLE blog_medias ADD CONSTRAINT blog_medias_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE page_medias ADD CONSTRAINT page_medias_page_id_fkey FOREIGN KEY (page_id) REFERENCES user_pages(page_id) ON DELETE CASCADE;
        ALTER TABLE page_medias ADD CONSTRAINT page_medias_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE subscribers ADD CONSTRAINT subscribers_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
        ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
        ALTER TABLE transactions ADD CONSTRAINT transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE SET NULL;
        ALTER TABLE email_logs ADD CONSTRAINT email_logs_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE email_logs ADD CONSTRAINT email_logs_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES blogs(blog_id) ON DELETE CASCADE;
        ALTER TABLE username_claims ADD CONSTRAINT username_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
        ALTER TABLE username_change_audits ADD CONSTRAINT username_change_audits_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
        ALTER TABLE username_change_audits ADD CONSTRAINT username_change_audits_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES users(user_id) ON DELETE SET NULL;
        ALTER TABLE views ADD CONSTRAINT views_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;
        ALTER TABLE views ADD CONSTRAINT views_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES blogs(blog_id) ON DELETE CASCADE;
    """)

    # 7. Recreate unique constraints and indexes
    op.execute("""
        ALTER TABLE authors ADD CONSTRAINT uq_authors_site_slug UNIQUE (site_id, slug);
        ALTER TABLE blogs ADD CONSTRAINT uq_blogs_site_slug UNIQUE (site_id, slug);
        ALTER TABLE user_pages ADD CONSTRAINT uq_user_pages_site_slug UNIQUE (site_id, slug);
        ALTER TABLE categories ADD CONSTRAINT uq_categories_site_slug UNIQUE (site_id, slug);
        ALTER TABLE blog_categories ADD CONSTRAINT uq_blog_categories_blog_category UNIQUE (blog_id, category_id);
        ALTER TABLE subscribers ADD CONSTRAINT uq_subscribers_site_email UNIQUE (site_id, email);
        ALTER TABLE email_logs ADD CONSTRAINT uq_email_logs_site_blog UNIQUE (site_id, blog_id);
        ALTER TABLE subscriptions ADD CONSTRAINT uq_subscriptions_user_id UNIQUE (user_id);

        CREATE INDEX IF NOT EXISTS ix_sites_user_id ON sites (user_id);
        CREATE INDEX IF NOT EXISTS ix_authors_site_id ON authors (site_id);
        CREATE INDEX IF NOT EXISTS ix_blogs_site_id ON blogs (site_id);
        CREATE INDEX IF NOT EXISTS ix_user_pages_site_id ON user_pages (site_id);
        CREATE INDEX IF NOT EXISTS ix_categories_site_id ON categories (site_id);
        CREATE INDEX IF NOT EXISTS ix_categories_site_menu_order ON categories (site_id, menu_order);
        CREATE INDEX IF NOT EXISTS ix_blogs_status_scheduled_at ON blogs (status, scheduled_at);
        CREATE INDEX IF NOT EXISTS ix_views_site_visited_at ON views (site_id, visited_at);
        CREATE INDEX IF NOT EXISTS ix_views_blog_visitor_hash ON views (blog_id, visitor_hash);
    """)


def downgrade() -> None:
    raise NotImplementedError("Downgrading from UUID back to Integer primary keys is not supported.")
