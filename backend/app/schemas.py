from pydantic import BaseModel
from datetime import datetime

class Post(BaseModel):
    title: str
    author: str
    date: datetime
    content: str
