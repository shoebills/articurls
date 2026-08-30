import enum
import uuid
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import Column, String, Integer, BigInteger, Enum, DateTime, Text, JSON, Index, UniqueConstraint, CheckConstraint, func, ForeignKey, Boolean, UUID, text


class Base(DeclarativeBase):
    pass


class DomainStatus(str, enum.Enum):
    NONE    = "none"     # No custom domain configured
    PENDING = "pending"  # Domain saved, ownership not yet verified
    ACTIVE  = "active"   # Verified + Pro subscription active
    GRACE   = "grace"    # Pro lapsed; domain still serving, 14-day countdown
    EXPIRED = "expired"  # Grace period over; 301 redirect to articurls URL

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    google_id = Column(String, nullable=True, unique=True, index=True)
    dodo_customer_id = Column(String, nullable=True, unique=True, index=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    token_version = Column(Integer, nullable=False, default=0)
    profile_image_url = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    sites = relationship("Site", back_populates="user", cascade="all, delete-orphan")


class Site(Base):
    __tablename__ = "sites"

    site_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    subdomain = Column(String, unique=True, nullable=False, index=True)
    
    custom_domain = Column(String, nullable=True, default=None, unique=True, index=True)
    custom_subpath = Column(String, nullable=True, default=None)
    cf_zone_id = Column(String, nullable=True, default=None)
    cf_route_id = Column(String, nullable=True, default=None)
    cf_connected = Column(Boolean, nullable=False, default=False)
    domain_status = Column(Enum(DomainStatus, name="domain_status_enum", values_callable=lambda x: [e.value for e in x]), nullable=False, default=DomainStatus.NONE)
    domain_dns_instructions = Column(JSON, nullable=True, default=None)
    verified_at = Column(DateTime(timezone=True), nullable=True, default=None)
    grace_started_at = Column(DateTime(timezone=True), nullable=True, default=None)
    grace_expires_at = Column(DateTime(timezone=True), nullable=True, default=None)

    # Design / Theme
    template_id = Column(String(32), nullable=False, default="editorial")
    site_mode = Column(String(16), nullable=False, default="system")
    color_theme = Column(String(32), nullable=False, default="base")
    custom_color = Column(String(16), nullable=True, default=None)
    font_family = Column(String(32), nullable=False, default="sans")
    button_style = Column(String(16), nullable=False, default="rounded")
    navbar_alignment = Column(String(16), nullable=False, default="left")
    navbar_style = Column(String(16), nullable=False, default="bordered")
    navbar_enabled = Column(Boolean, nullable=False, default=True)
    nav_blog_name = Column(String, nullable=True)
    nav_blog_name_size = Column(String(16), nullable=False, default="medium")
    nav_menu_enabled = Column(Boolean, nullable=False, default=True)
    nav_items = Column(JSON, nullable=True, default=None)
    show_about_section = Column(Boolean, nullable=False, default=False)
    site_footer_enabled = Column(Boolean, nullable=False, default=True)
    footer_columns = Column(JSON, nullable=True, default=None)
    footer_copyright = Column(String, nullable=True, default=None)
    footer_socials_enabled = Column(Boolean, nullable=False, default=True)
    footer_newsletter_enabled = Column(Boolean, nullable=False, default=True)
    footer_system_links_enabled = Column(Boolean, nullable=False, default=True)
    content_width = Column(String(8), nullable=False, default="wide")
    list_image_position = Column(String(16), nullable=False, default="above_title")
    show_preview_in_lists = Column(Boolean, nullable=False, default=True)
    about_title = Column(String(40), nullable=True)
    
    # Features
    rss_enabled = Column(Boolean, nullable=False, default=False)
    featured_blogs_enabled = Column(Boolean, nullable=False, default=True)
    featured_blog_ids = Column(JSON, nullable=True, default=[])
    subscriber_collection_enabled = Column(Boolean, nullable=False, default=True)
    umami_website_id = Column(String(36), nullable=True, default=None, index=True)

    # SEO
    meta_title = Column(String, nullable=True)
    meta_description = Column(String, nullable=True)
    favicon_url = Column(String, nullable=True)
    og_image_url = Column(String, nullable=True)

    # Code Injection
    custom_head_code = Column(Text, nullable=True, default=None)
    custom_body_code = Column(Text, nullable=True, default=None)
    custom_css = Column(Text, nullable=True, default=None)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="sites")
    authors = relationship("Author", back_populates="site", cascade="all, delete-orphan")


class Author(Base):
    __tablename__ = "authors"
    __table_args__ = (
        UniqueConstraint("site_id", "slug", name="uq_authors_site_slug"),
    )

    author_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    occupation = Column(String, nullable=True)
    instagram_link = Column(String, nullable=True)
    x_link = Column(String, nullable=True)
    pinterest_link = Column(String, nullable=True)
    facebook_link = Column(String, nullable=True)
    linkedin_link = Column(String, nullable=True)
    github_link = Column(String, nullable=True)
    youtube_link = Column(String, nullable=True)
    website_link = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    site = relationship("Site", back_populates="authors")


class BlogStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    SCHEDULED = "scheduled"


class PageStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Blog(Base):
    __tablename__ = "blogs"
    __table_args__ = (
        UniqueConstraint("site_id", "slug", name="uq_blogs_site_slug"),
        Index("ix_blogs_status_scheduled_at", "status", "scheduled_at"),
        Index("ix_blogs_site_status_published_at", "site_id", "status", "published_at"),
    )

    blog_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("authors.author_id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    slug = Column(String, nullable=False)
    meta_title = Column(String, nullable=True)
    meta_description = Column(String, nullable=True)
    featured_image_url = Column(String, nullable=True)
    notify_subscribers = Column(Boolean, nullable=False, default=False)
    status = Column(Enum(BlogStatus, name="blog_status"), default=BlogStatus.DRAFT, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), index=True, nullable=True)
    published_at = Column(DateTime(timezone=True), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    author = relationship("Author", lazy="joined")
    media = relationship("BlogMedia", back_populates="blog", cascade="all, delete-orphan", order_by=lambda: BlogMedia.sort_order)


class BlogMedia(Base):
    __tablename__ = "blog_medias"
    __table_args__ = (
        CheckConstraint("size_bytes >= 0", name="ck_blog_medias_size_nonneg"),
    )

    media_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    blog_id = Column(UUID(as_uuid=True), ForeignKey("blogs.blog_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
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
        UniqueConstraint("site_id", "email", name="uq_subscribers_site_email"),
        Index("ix_subscribers_site_active", "site_id", postgresql_where=text("unsubscribed_at IS NULL AND is_confirmed")),
        CheckConstraint("unsubscribed_at IS NULL OR subscribed_at IS NULL OR unsubscribed_at >= subscribed_at", name="ck_subscribers_unsub_after_sub"),
    )

    subscriber_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), index=True, nullable=False)
    email = Column(String, nullable=False)
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    unsubscribed_at = Column(DateTime(timezone=True), index=True, nullable=True)
    is_confirmed = Column(Boolean, index=True, nullable=False, default=False)


class EmailLogStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class EmailLogs(Base):
    __tablename__ = "email_logs"
    __table_args__ = (
        UniqueConstraint("site_id", "blog_id", name="uq_email_logs_site_blog"),
        CheckConstraint("total_recipients >= 0", name="ck_email_logs_recipients_nonneg"),
    )

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), index=True, nullable=False)
    blog_id = Column(UUID(as_uuid=True), ForeignKey("blogs.blog_id", ondelete="CASCADE"), index=True, nullable=False)
    total_recipients = Column(Integer, default=0, nullable=False)
    status = Column(Enum(EmailLogStatus, name="email_log_status", values_callable=lambda x: [e.value for e in x]), default=EmailLogStatus.PENDING, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SubscriptionPlanType(str, enum.Enum):
    TRIAL = "trial"
    PRO = "pro"
    LIFETIME = "lifetime"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"
    LAPSED = "lapsed"


class Subscriptions(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint(
            "current_period_end IS NULL OR current_period_start IS NULL OR current_period_end >= current_period_start",
            name="ck_subscriptions_period_order",
        ),
    )

    subscription_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), index=True, unique=True, nullable=False)
    dodo_subscription_id = Column(String, unique=True, nullable=True)
    plan_type = Column(Enum(SubscriptionPlanType, name="subscription_plan_type", values_callable=lambda x: [e.value for e in x]), nullable=False, default=SubscriptionPlanType.TRIAL)
    tier = Column(String, nullable=True, default=None)
    status = Column(Enum(SubscriptionStatus, name="subscription_status", values_callable=lambda x: [e.value for e in x]), nullable=False, default=SubscriptionStatus.INACTIVE)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    REFUND_FAILED = "refund_failed"


class Transactions(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_transactions_amount_nonneg"),
    )

    transaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), index=True, nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.subscription_id", ondelete="SET NULL"), nullable=True)
    dodo_payment_id = Column(String, unique=True, nullable=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="USD")
    status = Column(Enum(TransactionStatus, name="transaction_status", values_callable=lambda x: [e.value for e in x]), nullable=False, default=TransactionStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaymentWebhooks(Base):
    __tablename__ = "payment_webhooks"

    webhook_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    event_type = Column(String, nullable=False)
    dodo_event_id = Column(String, unique=True, nullable=False)
    payload = Column(JSON, nullable=False)
    processed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserPage(Base):
    __tablename__ = "user_pages"
    __table_args__ = (
        UniqueConstraint("site_id", "slug", name="uq_user_pages_site_slug"),
        Index("ix_user_pages_site_status", "site_id", "status"),
    )

    page_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    content = Column(Text, nullable=False, default="")
    meta_title = Column(String, nullable=True)
    meta_description = Column(String, nullable=True)
    status = Column(Enum(PageStatus, name="page_status"), default=PageStatus.DRAFT, nullable=False)
    published_at = Column(DateTime(timezone=True), index=True, nullable=True)
    show_in_footer = Column(Boolean, nullable=False, default=False)
    footer_order = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    media = relationship("PageMedia", back_populates="page", cascade="all, delete-orphan", order_by=lambda: PageMedia.sort_order)


class PageMedia(Base):
    __tablename__ = "page_medias"
    __table_args__ = (
        CheckConstraint("size_bytes >= 0", name="ck_page_medias_size_nonneg"),
    )

    media_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    page_id = Column(UUID(as_uuid=True), ForeignKey("user_pages.page_id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    page = relationship("UserPage", back_populates="media")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("site_id", "slug", name="uq_categories_site_slug"),
        Index("ix_categories_site_menu_order", "site_id", "menu_order"),
    )

    category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.site_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    description = Column(Text, nullable=True, default=None)
    show_in_menu = Column(Boolean, nullable=False, default=True)
    menu_order = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    blog_links = relationship("BlogCategory", back_populates="category", cascade="all, delete-orphan")


class BlogCategory(Base):
    __tablename__ = "blog_categories"
    __table_args__ = (
        UniqueConstraint("blog_id", "category_id", name="uq_blog_categories_blog_category"),
    )

    blog_category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    blog_id = Column(UUID(as_uuid=True), ForeignKey("blogs.blog_id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.category_id", ondelete="CASCADE"), nullable=False, index=True)

    category = relationship("Category", back_populates="blog_links")