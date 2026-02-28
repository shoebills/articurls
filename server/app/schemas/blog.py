from pydantic import BaseModel
from datetime import datetime

class CreateBlog(BaseModel):
    title: str
    content: str

    class Config:
        from_attributes = True

class GetBlog(BaseModel):
    blog_id: int
    title: str
    content: str
    is_published: bool
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class UpdateBlog(CreateBlog):
    is_published: bool
    pass