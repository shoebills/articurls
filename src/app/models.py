import enum
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, Enum, DateTime, func, ForeignKey

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