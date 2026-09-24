from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Literal
import uuid


class SiteCreate(BaseModel):
    subdomain: str
    site_name: Optional[str] = None
    template_id: Optional[str] = "saas"


class SiteUpdate(BaseModel):
    site_name: Optional[str] = None
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None


class SiteSummary(BaseModel):
    site_id: uuid.UUID
    subdomain: str
    custom_domain: Optional[str] = None
    custom_subpath: Optional[str] = None
    domain_status: str
    site_name: Optional[str] = None
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
    site_name: Optional[str] = None
    subdomain: str
    meta_title: str
    meta_description: str
    og_image_url: Optional[str] = None
    template_id: str = "saas"
    site_mode: str = "system"
    color_theme: str = "base"
    color_palette: Optional[dict] = None
    font_family: str = "sans"
    font_heading: str = "sans"
    font_content: str = "sans"
    font_ui: str = "sans"
    button_style: str = "rounded"
    button_variant: str = "solid"
    navbar_alignment: str = "left"
    navbar_style: str = "bordered"

    navbar_enabled: bool
    nav_menu_enabled: bool
    nav_items: Optional[list[dict]] = None
    logo_url: Optional[str] = None
    logo_link: Optional[str] = "/"
    search_enabled: bool = True

    hero_title: Optional[str] = None
    hero_description: Optional[str] = None
    site_language: str = "en"
    og_locale: Optional[str] = None

    cta_heading: Optional[str] = None
    cta_description: Optional[str] = None
    cta_button_text: Optional[str] = None
    cta_button_url: Optional[str] = None
    cta_show_on_posts: bool = True
    cta_show_on_pages: bool = False

    site_footer_enabled: bool = True
    footer_description: Optional[str] = None
    footer_columns: Optional[list[dict]] = None
    footer_copyright: Optional[str] = None
    footer_socials_enabled: bool = True
    footer_show_sitemap: bool = True
    footer_show_rss: bool = True
    footer_show_atom: bool = False

    newsletter_headline: Optional[str] = None
    newsletter_text: Optional[str] = None
    newsletter_disclaimer: Optional[str] = None
    newsletter_button_text: Optional[str] = "Subscribe"
    newsletter_show_near_header: bool = False
    newsletter_show_in_footer: bool = True
    newsletter_webhook_url: Optional[str] = None

    favicon_url: Optional[str] = None
    featured_blogs_enabled: bool = True
    featured_blog_ids: list[str] | None = []
    content_width: Literal["narrow", "wide"] = "wide"
    list_image_position: Literal["above_title", "next_to_title"] = "above_title"
    show_preview_in_lists: bool = True
    posts_per_page: int = 12
    pagination_type: Literal["prev_next", "numbered"] = "prev_next"
    toc_enabled: bool = True

    custom_domain: Optional[str] = None
    domain_status: Optional[str] = None
    rss_enabled: bool = False
    atom_enabled: bool = False
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None
    umami_website_id: Optional[str] = None

    class Config:
        from_attributes = True
