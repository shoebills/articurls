from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ..models import BlogStatus


class CreateBlog(BaseModel):
    title: str
    content: str
    slug: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class GetBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    slug: str
    seo_title: Optional[str]
    seo_description: Optional[str]
    status: BlogStatus
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True


class GetAll(GetBlog):
    view_count: int
        

class PublicBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    slug: str
    seo_title: Optional[str]
    seo_description: Optional[str]
    published_at: Optional[datetime]
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True


class UpdateBlog(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class ScheduleBlog(BaseModel):
    scheduled_at: datetime