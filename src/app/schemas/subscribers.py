from pydantic import BaseModel, EmailStr

class Subscribe(BaseModel):
    email: EmailStr

class Unsubscribe(BaseModel):
    email: EmailStr