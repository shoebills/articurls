from pydantic import BaseModel
from datetime import datetime

class CreatePost(BaseModel):
    title: str
    content: str

    class Config:
        from_attributes = True

class GetPost(BaseModel):
    post_id: int
    title: str
    content: str
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class UpdatePost(CreatePost):
    pass