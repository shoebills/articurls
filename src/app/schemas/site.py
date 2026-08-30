from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Literal
import uuid


class SiteCreate(BaseModel):
    subdomain: str
    nav_blog_name: Optional[str] = None


class SiteUpdate(BaseModel):
    nav_blog_name: Optional[str] = None
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None


class SiteSummary(BaseModel):
    site_id: uuid.UUID
    subdomain: str
    custom_domain: Optional[str] = None
    custom_subpath: Optional[str] = None
    domain_status: str
    nav_blog_name: Optional[str] = None
    template_id: str
    created_at: Optional[datetime] = None
    post_count: int = 0
    subscriber_count: int = 0

    class Config:
        from_attributes = True


class CodeInjectionSettings(BaseModel):
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None

    class Config:
        from_attributes = True


class CodeInjectionUpdate(BaseModel):
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None


class PublicSite(BaseModel):
    name: str
    subdomain: str
    meta_title: str
    meta_description: str
    og_image_url: Optional[str] = None
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
    favicon_url: Optional[str] = None
    featured_blogs_enabled: bool = True
    featured_blog_ids: list[str] | None = []
    content_width: Literal["narrow", "wide"] = "wide"
    list_image_position: Literal["above_title", "next_to_title"] = "above_title"
    show_preview_in_lists: bool = True
    about_title: Optional[str] = None
    subscriber_collection_enabled: bool = False
    custom_domain: Optional[str] = None
    domain_status: Optional[str] = None
    rss_enabled: bool = False
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None
    umami_website_id: Optional[str] = None

    class Config:
        from_attributes = True
