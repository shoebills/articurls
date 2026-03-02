from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CreateBlog(BaseModel):
    title: str
    content: str
    seo_title: str
    seo_description: str

    class Config:
        from_attributes = True

class GetBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    seo_title: str
    seo_description: str
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