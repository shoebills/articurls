from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
import uuid


class AuthorBase(BaseModel):
    name: str
    slug: Optional[str] = None
    bio: Optional[str] = None
    contact_email: Optional[str] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    youtube_link: Optional[str] = None
    website_link: Optional[str] = None
    profile_image_url: Optional[str] = None


class AuthorCreate(AuthorBase):
    pass


class AuthorUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    bio: Optional[str] = None
    contact_email: Optional[str] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    youtube_link: Optional[str] = None
    website_link: Optional[str] = None
    profile_image_url: Optional[str] = None


class AuthorOut(AuthorBase):
    author_id: uuid.UUID
    site_id: uuid.UUID
    name: str
    slug: str
    blog_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicAuthorSummary(BaseModel):
    author_id: uuid.UUID
    name: str
    slug: str
    bio: Optional[str] = None
    contact_email: Optional[str] = None
    profile_image_url: Optional[str] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    youtube_link: Optional[str] = None
    website_link: Optional[str] = None

    class Config:
        from_attributes = True
