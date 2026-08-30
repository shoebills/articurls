from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
import uuid


class CreateUser(BaseModel):
    name: str
    subdomain: str
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserSettings(BaseModel):
    user_id: uuid.UUID
    name: str
    subdomain: str
    email: EmailStr
    google_id: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    profile_image_url: Optional[str] = None

    template_id: str = "editorial"
    site_mode: str = "system"
    color_theme: str = "base"
    custom_color: Optional[str] = None
    font_family: str = "sans"
    button_style: str = "rounded"
    navbar_alignment: str = "left"
    navbar_style: str = "bordered"
    
    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_blog_name_size: Literal["small", "medium", "large"] = "medium"
    nav_menu_enabled: bool
    nav_items: Optional[list[dict]] = None
    show_about_section: bool
    site_footer_enabled: bool = True
    footer_columns: Optional[list[dict]] = None
    footer_copyright: Optional[str] = None
    footer_socials_enabled: bool = True
    footer_newsletter_enabled: bool = True
    footer_system_links_enabled: bool = True
    is_admin: bool = False
    favicon_url: Optional[str] = None
    featured_blogs_enabled: bool = True
    featured_blog_ids: list[str] | None = []
    subscriber_collection_enabled: bool = True
    custom_domain: Optional[str] = None
    content_width: Literal["narrow", "wide"] = "wide"
    list_image_position: Literal["above_title", "next_to_title"] = "above_title"
    show_preview_in_lists: bool = True
    domain_status: Optional[str] = None
    rss_enabled: bool = False
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None

    class Config:
        from_attributes = True
        

class UpdateUser(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    profile_image_url: Optional[str] = None


class UpdateProUser(BaseModel):
    navbar_enabled: Optional[bool] = None
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: Optional[bool] = None
    favicon_url: Optional[str] = None
    subscriber_collection_enabled: Optional[bool] = None


class SeoSettings(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image_url: Optional[str] = None
    rss_enabled: bool = False

    class Config:
        from_attributes = True


class SeoSettingsUpdate(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image_url: Optional[str] = None
    rss_enabled: Optional[bool] = None


class StorageUsage(BaseModel):
    used_bytes: int
    limit_bytes: Optional[int] = None
    is_unlimited: bool = False

