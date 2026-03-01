from pydantic import BaseModel
from datetime import datetime

class CreateUser(BaseModel):
    name: str
    user_name: str
    email: str
    password: str
    created_at: datetime

class GetUser(BaseModel):
    user_id: int
    name: str
    user_name: str
    email: str