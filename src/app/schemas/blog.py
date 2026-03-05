from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ..models import BlogStatus

class CreateBlog(BaseModel):
    title: str
    content: str
    slug: Optional[str] = None
    seo_title: str
    seo_description: str

    class Config:
        from_attributes = True

class GetBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    slug: str
    seo_title: str
    seo_description: str
    status: BlogStatus
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class UpdateBlog(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

    class Config:
        from_attributes = True

class ScheduleBlog(BaseModel):
    scheduled_at: datetime

    class Config:
        from_attributes = True