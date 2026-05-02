import enum
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import Column, String, Integer, Enum, DateTime, Text, JSON, Index, UniqueConstraint, func, ForeignKey, Boolean


class Base(DeclarativeBase):
    pass


class DomainStatus(str, enum.Enum):
    NONE    = "none"     # No custom domain configured
    PENDING = "pending"  # Domain saved, ownership not yet verified
    ACTIVE  = "active"   # Verified + Pro subscription active
    GRACE   = "grace"    # Pro lapsed; domain still serving, 30-day countdown
    EXPIRED = "expired"  # Grace period over; 301 redirect to articurls URL

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    user_name = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    meta_title = Column(String, nullable=True)
    meta_description = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    link = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    instagram_link = Column(String, nullable=True)
    x_link = Column(String, nullable=True)
    pinterest_link = Column(String, nullable=True)
    facebook_link = Column(String, nullable=True)
    linkedin_link = Column(String, nullable=True)
    github_link = Column(String, nullable=True)
    youtube_link = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    email_verified = Column(Boolean, nullable=False, default=False)

    custom_domain = Column(String, nullable=True, default=None)
    is_domain_verified = Column(Boolean, nullable=False, default=False)
    domain_status = Column(Enum(DomainStatus, name="domain_status_enum", values_callable=lambda x: [e.value for e in x]), nullable=False, default=DomainStatus.NONE)
    cloudflare_hostname_id = Column(String, nullable=True, default=None)
    domain_dns_instructions = Column(JSON, nullable=True, default=None)  # cached DNS records from Cloudflare
    verified_at = Column(DateTime(timezone=True), nullable=True, default=None)
    grace_started_at = Column(DateTime(timezone=True), nullable=True, default=None)
    grace_expires_at = Column(DateTime(timezone=True), nullable=True, default=None)

    verification_tick = Column(Boolean, nullable=False, default=False)
    navbar_enabled = Column(Boolean, nullable=False, default=True)
    nav_blog_name = Column(String, nullable=True)
    nav_menu_enabled = Column(Boolean, nullable=False, default=False)
    footer_enabled = Column(Boolean, nullable=False, default=False)
    site_footer_enabled = Column(Boolean, nullable=False, default=False)
    use_default_preview_image = Column(Boolean, nullable=False, default=True)
    robots_mode = Column(String, nullable=False, default="auto")
    robots_custom_rules = Column(Text, nullable=True)
    sitemap_enabled = Column(Boolean, nullable=False, default=True)
    ads_enabled = Column(Boolean, nullable=False, default=False)
    ad_code = Column(Text, nullable=True)
    ad_frequency = Column(Integer, nullable=False, default=3)
    username_change_count = Column(Integer, nullable=False, default=0)
    featured_blogs_enabled = Column(Boolean, nullable=False, default=False)
    featured_blog_ids = Column(JSON, nullable=True, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)


class UsernameClaim(Base):
    __tablename__ = "username_claims"

    claim_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    claimed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UsernameChangeAudit(Base):
    __tablename__ = "username_change_audits"

    audit_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    old_username = Column(String, nullable=False)
    new_username = Column(String, nullable=False)
    actor_user_id = Column(ForeignKey("users.user_id"), nullable=True, index=True)
    actor_email = Column(String, nullable=True)
    is_admin_override = Column(Boolean, nullable=False, default=False)
    reason = Column(String, nullable=True)
    request_ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UsernameChangeRequest(Base):
    __tablename__ = "username_change_requests"

    request_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    desired_username = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending|approved|rejected
    admin_note = Column(String, nullable=True)
    reviewed_by_user_id = Column(ForeignKey("users.user_id"), nullable=True, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class BlogStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    SCHEDULED = "scheduled"

class Blog(Base):
    __tablename__ = "blogs"
    __table_args__ = (
        UniqueConstraint("user_id", "slug", name="uq_blogs_user_slug"),
        Index("ix_blogs_status_scheduled_at", "status", "scheduled_at"),
    )

    blog_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    slug = Column(String, index=True, nullable=False)
    meta_title = Column(String, nullable=True)
    meta_description = Column(String, nullable=True)
    featured_image_url = Column(String, nullable=True)
    notify_subscribers = Column(Boolean, nullable=False, default=False)
    ads_enabled = Column(Boolean, nullable=False, default=False)
    status = Column(Enum(BlogStatus, name="blog_status"), default=BlogStatus.DRAFT, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), index=True, nullable=True)
    published_at = Column(DateTime(timezone=True), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    media = relationship("BlogMedia", back_populates="blog", cascade="all, delete-orphan", order_by=lambda: BlogMedia.sort_order)

class BlogMedia(Base):
    __tablename__ = "blog_medias"

    media_id = Column(Integer, primary_key=True)
    blog_id = Column(ForeignKey("blogs.blog_id"), nullable=False, index=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    url = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    blog = relationship("Blog", back_populates="media")

class Subscriber(Base):
    __tablename__ = "subscribers"
    __table_args__ = (
        UniqueConstraint("user_id", "email", name="uq_subscribers_user_email"),
    )

    subscriber_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), index=True, nullable=False)
    email = Column(String, nullable=False)
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    unsubscribed_at = Column(DateTime(timezone=True), index=True, nullable=True)
    is_confirmed = Column(Boolean, index=True, nullable=False, default=False)

class EmailLogs(Base):
    __tablename__ = "email_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "blog_id", name="uq_email_logs_user_blog"),
    )

    log_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), index=True, nullable=False)
    blog_id = Column(ForeignKey("blogs.blog_id"), index=True, nullable=False)
    total_recipients = Column(Integer, default=0, nullable=False)
    status = Column(String, default="pending", nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Views(Base):
    __tablename__ = "views"
    __table_args__ = (
        Index("ix_views_user_visited_at", "user_id", "visited_at"),
        Index("ix_views_blog_visitor_hash", "blog_id", "visitor_hash"),
    )

    view_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), index=True, nullable=False)
    blog_id = Column(ForeignKey("blogs.blog_id"), index=True, nullable=False)
    visitor_hash = Column(String, nullable=False)
    visited_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

class Subscriptions(Base):
    __tablename__ = "subscriptions"

    subscription_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True, unique=True, nullable=False)
    dodo_subscription_id = Column(String, unique=True, nullable=True)
    plan_type = Column(String, nullable=False, default="free")  # "free", "pro"
    status = Column(String, nullable=False, default="inactive")  # "active", "inactive", "cancelled", "past_due"
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Transactions(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True, nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.subscription_id"), nullable=True)
    dodo_payment_id = Column(String, unique=True, nullable=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="USD")
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PaymentWebhooks(Base):
    __tablename__ = "payment_webhooks"

    webhook_id = Column(Integer, primary_key=True)
    event_type = Column(String, nullable=False)
    dodo_event_id = Column(String, unique=True, nullable=False)
    payload = Column(JSON, nullable=False)
    processed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserPage(Base):
    __tablename__ = "user_pages"
    __table_args__ = (
        UniqueConstraint("user_id", "slug", name="uq_user_pages_user_slug"),
        Index("ix_user_pages_user_menu_order", "user_id", "menu_order"),
    )

    page_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    content = Column(Text, nullable=False, default="")
    show_in_menu = Column(Boolean, nullable=False, default=False)
    menu_order = Column(Integer, nullable=True)
    show_in_footer = Column(Boolean, nullable=False, default=False)
    footer_order = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("user_id", "slug", name="uq_categories_user_slug"),
        Index("ix_categories_user_menu_order", "user_id", "menu_order"),
    )

    category_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    show_in_menu = Column(Boolean, nullable=False, default=False)
    menu_order = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    blog_links = relationship("BlogCategory", back_populates="category", cascade="all, delete-orphan")


class BlogCategory(Base):
    __tablename__ = "blog_categories"
    __table_args__ = (
        UniqueConstraint("blog_id", "category_id", name="uq_blog_categories_blog_category"),
    )

    blog_category_id = Column(Integer, primary_key=True)
    blog_id = Column(ForeignKey("blogs.blog_id"), nullable=False, index=True)
    category_id = Column(ForeignKey("categories.category_id"), nullable=False, index=True)

    category = relationship("Category", back_populates="blog_links")
