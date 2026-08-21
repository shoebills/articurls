from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import uuid
from ..models import BlogStatus
from .author import PublicAuthorSummary


class BlogMediaOut(BaseModel):
    media_id: uuid.UUID
    url: str
    sort_order: int

    class Config:
        from_attributes = True


class CreateBlog(BaseModel):
    title: str = Field(..., max_length=300)
    content: str = Field(..., max_length=500_000)
    slug: Optional[str] = None
    author_id: Optional[uuid.UUID] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    notify_subscribers: bool = False


class GetBlog(BaseModel):
    blog_id: uuid.UUID
    title: str
    content: str
    slug: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    notify_subscribers: bool
    status: BlogStatus
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    site_id: Optional[uuid.UUID] = None
    author_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    author: Optional[PublicAuthorSummary] = None
    media: list[BlogMediaOut] = []
    category_ids: List[uuid.UUID] = []

    class Config:
        from_attributes = True


class GetAll(GetBlog):
    excerpt: Optional[str] = None
        

class PublicBlog(BaseModel):
    blog_id: uuid.UUID
    title: str
    content: str
    slug: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    published_at: Optional[datetime] = None
    updated_at: datetime
    site_id: Optional[uuid.UUID] = None
    author_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    author: Optional[PublicAuthorSummary] = None
    media: list[BlogMediaOut] = []
    category_ids: List[uuid.UUID] = []

    class Config:
        from_attributes = True


class PublicBlogs(PublicBlog):
    excerpt: Optional[str] = None


class PublicBlogSearchResult(BaseModel):
    blog_id: uuid.UUID
    title: str
    slug: str
    excerpt: Optional[str] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpdateBlog(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    content: Optional[str] = Field(None, max_length=500_000)
    slug: Optional[str] = None
    author_id: Optional[uuid.UUID] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    notify_subscribers: Optional[bool] = None

class ScheduleBlog(BaseModel):
    scheduled_at: datetime