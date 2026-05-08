from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, Literal


class CreateUser(BaseModel):
    name: str
    user_name: str
    email: EmailStr
    password: str 


class UserSettings(BaseModel):
    user_id: int
    name: str
    user_name: str
    email: EmailStr
    google_id: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    bio: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    youtube_link: Optional[str] = None
    profile_image_url: Optional[str] = None

    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: bool
    footer_enabled: bool
    site_footer_enabled: bool = False
    username_change_count: int
    is_admin: bool = False
    favicon_url: Optional[str] = None
    featured_blogs_enabled: bool = False
    featured_blog_ids: list[int] | None = []
    subscriber_collection_enabled: bool = True
    custom_domain: Optional[str] = None
    domain_status: Optional[str] = None

    class Config:
        from_attributes = True
        

class PublicUser(BaseModel):
    name: str
    user_name: str
    meta_title: str
    meta_description: str
    bio: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    youtube_link: Optional[str] = None
    profile_image_url: Optional[str] = None
    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: bool
    footer_enabled: bool
    site_footer_enabled: bool = False
    show_articurls_watermark: bool = True
    favicon_url: Optional[str] = None
    featured_blogs_enabled: bool = False
    featured_blog_ids: list[int] | None = []
    subscriber_collection_enabled: bool = False
    custom_domain: Optional[str] = None
    domain_status: Optional[str] = None
    # SEO control fields — consumed by sitemap and robots.txt generation
    sitemap_enabled: bool = True
    robots_mode: str = "auto"
    robots_custom_rules: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateUser(BaseModel):
    name: Optional[str] = None
    user_name: Optional[str] = None
    email: Optional[EmailStr] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    bio: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    youtube_link: Optional[str] = None
    profile_image_url: Optional[str] = None


class UpdateProUser(BaseModel):
    navbar_enabled: Optional[bool] = None
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: Optional[bool] = None
    favicon_url: Optional[str] = None
    subscriber_collection_enabled: Optional[bool] = None


class AdminUsernameChange(BaseModel):
    user_name: str
    reason: Optional[str] = None


class UsernameChangeRequestCreate(BaseModel):
    desired_username: str
    reason: Optional[str] = None


class UsernameChangeRequestOut(BaseModel):
    request_id: int
    user_id: int
    desired_username: str
    reason: Optional[str] = None
    status: str
    admin_note: Optional[str] = None
    reviewed_by_user_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UsernameChangeRequestReview(BaseModel):
    status: Literal["approved", "rejected"]
    admin_note: Optional[str] = None


class MonetizationSettings(BaseModel):
    ads_enabled: bool
    ad_code: Optional[str] = None
    ad_frequency: int = 3

    class Config:
        from_attributes = True


class MonetizationSettingsUpdate(BaseModel):
    ads_enabled: Optional[bool] = None
    ad_code: Optional[str] = None
    ad_frequency: Optional[int] = None


class MetaSettings(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None

    class Config:
        from_attributes = True


class MetaSettingsUpdate(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
