from datetime import datetime
from pydantic import BaseModel, EmailStr

class Subscribe(BaseModel):
    email: EmailStr

class Unsubscribe(BaseModel):
    email: EmailStr

class RecentSubscriber(BaseModel):
    email: str
    subscribed_at: datetime
    is_confirmed: bool
    unsubscribed_at: datetime | None