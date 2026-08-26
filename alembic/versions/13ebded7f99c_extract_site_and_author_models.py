"""extract site and author models

Revision ID: 13ebded7f99c
Revises: 05c6e4730035
Create Date: 2026-08-19 20:27:54.159793

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '13ebded7f99c'
down_revision: Union[str, Sequence[str], None] = '05c6e4730035'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sites table
    op.create_table(
        'sites',
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('subdomain', sa.String(), nullable=False),
        sa.Column('custom_domain', sa.String(), nullable=True),
        sa.Column('custom_subpath', sa.String(), nullable=True),
        sa.Column('domain_status', postgresql.ENUM('none', 'pending', 'active', 'grace', 'expired', name='domain_status_enum', create_type=False), nullable=False, server_default='none'),
        sa.Column('domain_dns_instructions', sa.JSON(), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('grace_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('grace_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_username_change_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('theme_id', sa.String(length=32), nullable=False, server_default='editorial'),
        sa.Column('navbar_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('nav_blog_name', sa.String(), nullable=True),
        sa.Column('nav_blog_name_size', sa.String(length=16), nullable=False, server_default='medium'),
        sa.Column('nav_menu_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_about_section', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('site_footer_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('content_width', sa.String(length=8), nullable=False, server_default='wide'),
        sa.Column('list_image_position', sa.String(length=16), nullable=False, server_default='above_title'),
        sa.Column('show_preview_in_lists', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('about_title', sa.String(length=40), nullable=True),
        sa.Column('rss_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('featured_blogs_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('featured_blog_ids', sa.JSON(), nullable=True),
        sa.Column('subscriber_collection_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('umami_website_id', sa.String(length=36), nullable=True),
        sa.Column('meta_title', sa.String(), nullable=True),
        sa.Column('meta_description', sa.String(), nullable=True),
        sa.Column('favicon_url', sa.String(), nullable=True),
        sa.Column('og_image_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('site_id')
    )
    op.create_index(op.f('ix_sites_custom_domain'), 'sites', ['custom_domain'], unique=True)
    op.create_index(op.f('ix_sites_subdomain'), 'sites', ['subdomain'], unique=True)
    op.create_index(op.f('ix_sites_user_id'), 'sites', ['user_id'], unique=False)
    op.create_index(op.f('ix_sites_umami_website_id'), 'sites', ['umami_website_id'], unique=False)

    # 2. Create authors table
    op.create_table(
        'authors',
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('instagram_link', sa.String(), nullable=True),
        sa.Column('x_link', sa.String(), nullable=True),
        sa.Column('pinterest_link', sa.String(), nullable=True),
        sa.Column('facebook_link', sa.String(), nullable=True),
        sa.Column('linkedin_link', sa.String(), nullable=True),
        sa.Column('github_link', sa.String(), nullable=True),
        sa.Column('youtube_link', sa.String(), nullable=True),
        sa.Column('website_link', sa.String(), nullable=True),
        sa.Column('profile_image_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['site_id'], ['sites.site_id'], ),
        sa.PrimaryKeyConstraint('author_id')
    )
    op.create_index(op.f('ix_authors_site_id'), 'authors', ['site_id'], unique=False)
    op.create_index(op.f('ix_authors_slug'), 'authors', ['slug'], unique=False)

    # 3. Add site_id / author_id to existing tables
    tables = [
        'blogs', 'blog_medias', 'user_pages', 'page_medias',
        'categories', 'subscribers', 'email_logs'
    ]
    # 'views' may already be gone: it was dropped by b2c3d4e5f6a8, which
    # precedes this revision in the graph. Guard all views handling.
    views_present = bool(
        op.get_bind().execute(sa.text("SELECT to_regclass('views')")).scalar()
    )
    all_tables = tables + ['views'] if views_present else tables

    for table in all_tables:
        op.add_column(table, sa.Column('site_id', sa.Integer(), nullable=True))
        
    op.add_column('blogs', sa.Column('author_id', sa.Integer(), nullable=True))
    
    # 4. Data Migration
    op.execute("""
        INSERT INTO sites (
            user_id, subdomain, custom_domain, domain_status, domain_dns_instructions,
            verified_at, grace_started_at, grace_expires_at, last_username_change_at,
            navbar_enabled, nav_blog_name, nav_blog_name_size, nav_menu_enabled,
            show_about_section, site_footer_enabled, content_width, list_image_position,
            show_preview_in_lists, about_title, rss_enabled, featured_blogs_enabled,
            featured_blog_ids, subscriber_collection_enabled, umami_website_id,
            meta_title, meta_description, favicon_url, og_image_url, created_at, updated_at
        )
        SELECT 
            user_id, user_name, custom_domain, domain_status, domain_dns_instructions,
            verified_at, grace_started_at, grace_expires_at, last_username_change_at,
            navbar_enabled, nav_blog_name, nav_blog_name_size, nav_menu_enabled,
            show_about_section, site_footer_enabled, content_width, list_image_position,
            show_preview_in_lists, about_title, rss_enabled, featured_blogs_enabled,
            featured_blog_ids, subscriber_collection_enabled, umami_website_id,
            meta_title, meta_description, favicon_url, og_image_url, created_at, updated_at
        FROM users
    """)

    op.execute("""
        INSERT INTO authors (
            site_id, name, slug, bio, contact_email, instagram_link, x_link,
            pinterest_link, facebook_link, linkedin_link, github_link,
            youtube_link, website_link, profile_image_url, created_at, updated_at
        )
        SELECT 
            s.site_id, u.name, u.user_name, u.bio, u.contact_email, u.instagram_link, u.x_link,
            u.pinterest_link, u.facebook_link, u.linkedin_link, u.github_link,
            u.youtube_link, u.website_link, u.profile_image_url, u.created_at, u.updated_at
        FROM users u
        JOIN sites s ON s.user_id = u.user_id
    """)

    for table in all_tables:
        op.execute(f"""
            UPDATE {table} t
            SET site_id = s.site_id
            FROM sites s
            WHERE t.user_id = s.user_id
        """)

    op.execute("""
        UPDATE blogs b
        SET author_id = a.author_id
        FROM authors a
        WHERE b.site_id = a.site_id
    """)

    # 5. Constraints & Indexes changes
    for table in all_tables:
        op.alter_column(table, 'site_id', existing_type=sa.Integer(), nullable=False)
        op.create_index(op.f(f'ix_{table}_site_id'), table, ['site_id'], unique=False)
        op.create_foreign_key(f'fk_{table}_site_id', table, 'sites', ['site_id'], ['site_id'])

    op.create_index(op.f('ix_blogs_author_id'), 'blogs', ['author_id'], unique=False)
    op.create_foreign_key('fk_blogs_author_id', 'blogs', 'authors', ['author_id'], ['author_id'])

    op.drop_constraint('uq_blogs_user_slug', 'blogs', type_='unique')
    op.create_unique_constraint('uq_blogs_site_slug', 'blogs', ['site_id', 'slug'])

    op.drop_constraint('uq_user_pages_user_slug', 'user_pages', type_='unique')
    op.create_unique_constraint('uq_user_pages_site_slug', 'user_pages', ['site_id', 'slug'])

    op.drop_constraint('uq_categories_user_slug', 'categories', type_='unique')
    op.create_unique_constraint('uq_categories_site_slug', 'categories', ['site_id', 'slug'])

    op.drop_index('ix_categories_user_menu_order', table_name='categories')
    op.create_index('ix_categories_site_menu_order', 'categories', ['site_id', 'menu_order'])

    op.drop_constraint('uq_subscribers_user_email', 'subscribers', type_='unique')
    op.create_unique_constraint('uq_subscribers_site_email', 'subscribers', ['site_id', 'email'])

    op.drop_constraint('uq_email_logs_user_blog', 'email_logs', type_='unique')
    op.create_unique_constraint('uq_email_logs_site_blog', 'email_logs', ['site_id', 'blog_id'])

    if views_present:
        op.drop_index('ix_views_user_visited_at', table_name='views')
        op.create_index('ix_views_site_visited_at', 'views', ['site_id', 'visited_at'])

    for table in all_tables:
        op.drop_index(f'ix_{table}_user_id', table_name=table)
        op.drop_constraint(f'{table}_user_id_fkey', table, type_='foreignkey')
        op.drop_column(table, 'user_id')

    # Users table cleanup
    op.drop_index('ix_users_custom_domain', table_name='users')
    op.drop_index('ix_users_umami_website_id', table_name='users')
    op.drop_constraint('users_user_name_key', 'users', type_='unique')

    columns_to_drop = [
        'user_name', 'custom_domain', 'domain_status', 'domain_dns_instructions',
        'verified_at', 'grace_started_at', 'grace_expires_at', 'last_username_change_at',
        'navbar_enabled', 'nav_blog_name', 'nav_blog_name_size', 'nav_menu_enabled',
        'show_about_section', 'site_footer_enabled', 'content_width', 'list_image_position',
        'show_preview_in_lists', 'about_title', 'rss_enabled', 'featured_blogs_enabled',
        'featured_blog_ids', 'subscriber_collection_enabled', 'umami_website_id',
        'meta_title', 'meta_description', 'favicon_url', 'og_image_url',
        'bio', 'contact_email', 'instagram_link', 'x_link', 'pinterest_link', 'facebook_link',
        'linkedin_link', 'github_link', 'youtube_link', 'website_link', 'profile_image_url'
    ]
    for col in columns_to_drop:
        op.drop_column('users', col)


def downgrade() -> None:
    pass
