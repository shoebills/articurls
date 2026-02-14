from pydantic import BaseModel

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