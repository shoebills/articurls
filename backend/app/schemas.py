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

    class Config:
        from_attributes = True

class UpdatePost(CreatePost):
    pass

class CreateUser(BaseModel):
    name: str
    email: str
    password: str

class GetUser(BaseModel):
    user_id: int
    name: str
    email: str