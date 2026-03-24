import enum
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, Enum, DateTime, func, ForeignKey, Boolean

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    user_name = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    seo_title = Column(String, nullable=True)
    seo_description = Column(String, nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    remove_footer = Column(Boolean, nullable=False, default=False)
    custom_domain = Column(String, nullable=True, default=None)
    email_notifications = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

class BlogStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    SCHEDULED = "scheduled"

class Blog(Base):
    __tablename__ = "blogs"

    blog_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    slug = Column(String, index=True, nullable=False)
    seo_title = Column(String, nullable=True)
    seo_description = Column(String, nullable=True)
    status = Column(Enum(BlogStatus, name="blog_status"), default=BlogStatus.DRAFT, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), index=True, nullable=True)
    published_at = Column(DateTime(timezone=True), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Subscriber(Base):
    __tablename__ = "subscribers"

    subscriber_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), index=True, nullable=False)
    email = Column(String, nullable=False)
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    unsubscribed_at = Column(DateTime(timezone=True), index=True, nullable=True)
    is_confirmed = Column(Boolean, index=True, nullable=False, default=False)

class EmailLogs(Base):
    __tablename__ = "email_logs"

    log_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), index=True, nullable=False)
    blog_id = Column(ForeignKey("blogs.blog_id"), index=True, nullable=False)
    total_recipients = Column(Integer, default=0, nullable=False)
    status = Column(String, default="pending", nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Views(Base):
    __tablename__ = "views"

    view_id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.user_id"), index=True, nullable=False)
    blog_id = Column(ForeignKey("blogs.blog_id"), index=True, nullable=False)
    visitor_hash = Column(String, nullable=False)
    visited_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

class Subscriptions(Base):
    __tablename__ = "subscriptions"

    subscription_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True, nullable=False)
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
    payload = Column(String, nullable=False)
    processed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())