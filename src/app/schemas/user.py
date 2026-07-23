from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, Literal


class CreateUser(BaseModel):
    name: str
    user_name: str
    email: EmailStr
    password: str = Field(..., min_length=8)


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
    website_link: Optional[str] = None
    profile_image_url: Optional[str] = None

    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_blog_name_size: Literal["small", "medium", "large"] = "medium"
    nav_menu_enabled: bool
    show_about_section: bool
    site_footer_enabled: bool = True
    last_username_change_at: Optional[datetime] = None
    is_admin: bool = False
    favicon_url: Optional[str] = None
    featured_blogs_enabled: bool = True
    featured_blog_ids: list[int] | None = []
    subscriber_collection_enabled: bool = True
    remove_branding: bool = True
    custom_domain: Optional[str] = None
    content_width: Literal["narrow", "wide"] = "wide"
    list_image_position: Literal["above_title", "next_to_title"] = "above_title"
    show_preview_in_lists: bool = True
    domain_status: Optional[str] = None
    rss_enabled: bool = False

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
    website_link: Optional[str] = None
    profile_image_url: Optional[str] = None
    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_blog_name_size: Literal["small", "medium", "large"] = "medium"
    nav_menu_enabled: bool
    show_about_section: bool
    site_footer_enabled: bool = True
    show_articurls_watermark: bool = True
    favicon_url: Optional[str] = None
    featured_blogs_enabled: bool = True
    featured_blog_ids: list[int] | None = []
    content_width: Literal["narrow", "wide"] = "wide"
    list_image_position: Literal["above_title", "next_to_title"] = "above_title"
    show_preview_in_lists: bool = True
    about_title: Optional[str] = None
    subscriber_collection_enabled: bool = False
    custom_domain: Optional[str] = None
    domain_status: Optional[str] = None
    rss_enabled: bool = False
    umami_website_id: Optional[str] = None

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
    website_link: Optional[str] = None
    profile_image_url: Optional[str] = None


class UpdateProUser(BaseModel):
    navbar_enabled: Optional[bool] = None
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: Optional[bool] = None
    favicon_url: Optional[str] = None
    subscriber_collection_enabled: Optional[bool] = None
    remove_branding: Optional[bool] = None


class AdminUsernameChange(BaseModel):
    user_name: str
    reason: Optional[str] = None


class MetaSettings(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    rss_enabled: bool = False

    class Config:
        from_attributes = True


class MetaSettingsUpdate(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    rss_enabled: Optional[bool] = None


class StorageUsage(BaseModel):
    used_bytes: int
    limit_bytes: Optional[int] = None
    is_unlimited: bool = False


class WelcomeEmailSettings(BaseModel):
    welcome_email_enabled: bool = False
    welcome_email_subject: Optional[str] = None
    welcome_email_body_html: Optional[str] = None
    welcome_email_delay_minutes: int = 0

    class Config:
        from_attributes = True


class WelcomeEmailSettingsUpdate(BaseModel):
    welcome_email_enabled: Optional[bool] = None
    welcome_email_subject: Optional[str] = None
    welcome_email_body_html: Optional[str] = None
    welcome_email_delay_minutes: Optional[int] = None


class WelcomeEmailPreviewIn(BaseModel):
    welcome_email_subject: Optional[str] = None
    welcome_email_body_html: Optional[str] = None
    use_default_body: bool = False


class WelcomeEmailPreviewOut(BaseModel):
    subject: str
    html: str
