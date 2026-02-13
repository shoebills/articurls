from pydantic import BaseModel
from datetime import datetime

class PostBase(BaseModel):
    title: str
    content: str

    class Config:
        from_attributes = True

class Post(PostBase):
    post_id: int
    pass

    class Config:
        from_attributes = True