from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

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

class UpdateUser(BaseModel):
    name: Optional[str] = None
    user_name: Optional[str] = None
    email: Optional[EmailStr] = None