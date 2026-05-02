from pydantic import BaseModel
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
    title: str
    content: str
    slug: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    notify_subscribers: bool = False


class GetBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    slug: str
    meta_title: Optional[str]
    meta_description: Optional[str]
    featured_image_url: Optional[str]
    notify_subscribers: bool
    ads_enabled: bool
    status: BlogStatus
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    user_id: int
    media: list[BlogMediaOut] = []
    category_ids: List[int] = []

    class Config:
        from_attributes = True


class GetAll(GetBlog):
    view_count: int
    excerpt: Optional[str] = None
        

class PublicBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    slug: str
    meta_title: Optional[str]
    meta_description: Optional[str]
    featured_image_url: Optional[str]
    ads_enabled: bool
    published_at: Optional[datetime]
    updated_at: datetime
    user_id: int
    media: list[BlogMediaOut] = []
    category_ids: List[int] = []

    class Config:
        from_attributes = True


class PublicBlogs(PublicBlog):
    excerpt: Optional[str] = None


class UpdateBlog(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    slug: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    notify_subscribers: Optional[bool] = None
    ads_enabled: Optional[bool] = None


class AdsSelectionUpdate(BaseModel):
    blog_ids: list[int]


class PublicBlogAds(BaseModel):
    enabled: bool
    ad_code: Optional[str] = None
    ad_frequency: int = 3

class ScheduleBlog(BaseModel):
    scheduled_at: datetime