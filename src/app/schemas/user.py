from pydantic import BaseModel, EmailStr
from typing import Optional, Literal


class CreateUser(BaseModel):
    name: str
    user_name: str
    email: EmailStr
    password: str
    plan_choice: Literal["free", "pro"] = "free" 


class GetUser(BaseModel):
    user_id: int
    name: str
    user_name: str
    email: EmailStr
    seo_title: str
    seo_description: str
    profile_image_url: Optional[str] = None

    class Config:
        from_attributes = True
        

class PublicUser(BaseModel):
    name: str
    user_name: str
    seo_title: str
    seo_description: str
    profile_image_url: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateUser(BaseModel):
    name: Optional[str] = None
    user_name: Optional[str] = None
    email: Optional[EmailStr] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    profile_image_url: Optional[str] = None