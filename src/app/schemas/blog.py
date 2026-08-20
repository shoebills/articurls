from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from ..models import BlogStatus


class BlogMediaOut(BaseModel):
    media_id: int
    url: str
    sort_order: int

    class Config:
        from_attributes = True


class CreateBlog(BaseModel):
    title: str = Field(..., max_length=300)
    content: str = Field(..., max_length=500_000)
    slug: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    notify_subscribers: bool = False


class GetBlog(BaseModel):
    blog_id: int
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
    site_id: Optional[int] = None
    author_id: Optional[int] = None
    user_id: Optional[int] = None
    media: list[BlogMediaOut] = []
    category_ids: List[int] = []

    class Config:
        from_attributes = True


class GetAll(GetBlog):
    excerpt: Optional[str] = None
        

class PublicBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    slug: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    published_at: Optional[datetime] = None
    updated_at: datetime
    site_id: Optional[int] = None
    author_id: Optional[int] = None
    user_id: Optional[int] = None
    media: list[BlogMediaOut] = []
    category_ids: List[int] = []

    class Config:
        from_attributes = True


class PublicBlogs(PublicBlog):
    excerpt: Optional[str] = None


class PublicBlogSearchResult(BaseModel):
    blog_id: int
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
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    notify_subscribers: Optional[bool] = None

class ScheduleBlog(BaseModel):
    scheduled_at: datetime