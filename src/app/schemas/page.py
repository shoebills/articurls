from pydantic import BaseModel
from typing import List, Literal, Optional
from datetime import datetime
import uuid
from .. import models


class UserPageBase(BaseModel):
    title: str = ""
    content: str = ""


class FaqItem(BaseModel):
    question: str
    answer: str


class UserPageCreate(UserPageBase):
    slug: Optional[str] = None


class UserPageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    slug: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    og_image_url: Optional[str] = None
    canonical_url: Optional[str] = None
    noindex: Optional[bool] = None
    custom_schema: Optional[dict] = None
    faq_items: Optional[List[FaqItem]] = None
    show_in_footer: Optional[bool] = None


class PageMediaOut(BaseModel):
    media_id: uuid.UUID
    url: str
    sort_order: int

    class Config:
        from_attributes = True


class UserPageStatusUpdate(BaseModel):
    status: models.PageStatus


class UserPageOut(UserPageBase):
    page_id: uuid.UUID
    site_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    slug: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    og_image_url: Optional[str] = None
    canonical_url: Optional[str] = None
    noindex: bool = False
    custom_schema: Optional[dict] = None
    faq_items: Optional[List[FaqItem]] = []
    status: models.PageStatus
    published_at: Optional[datetime] = None
    show_in_footer: bool
    footer_order: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DesignSettings(BaseModel):
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
    navbar_enabled: bool = True
    site_name: Optional[str] = None
    nav_menu_enabled: bool = True
    nav_items: Optional[List[dict]] = None
    logo_url: Optional[str] = None
    logo_link: Optional[str] = "/"
    search_enabled: bool = True
    theme_toggle_enabled: bool = True

    hero_title: Optional[str] = None
    hero_description: Optional[str] = None
    site_language: str = "en"
    og_locale: Optional[str] = None
    atom_enabled: bool = False
    rss_enabled: bool = False

    cta_heading: Optional[str] = None
    cta_description: Optional[str] = None
    cta_button_text: Optional[str] = None
    cta_button_url: Optional[str] = None
    cta_show_on_posts: bool = True
    cta_show_on_pages: bool = False

    site_footer_enabled: bool = True
    footer_description: Optional[str] = None
    footer_columns: Optional[List[dict]] = None
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
    newsletter_webhook_token: Optional[str] = None

    featured_blogs_enabled: bool = True
    featured_blog_ids: list[str] | None = []
    content_layout: Literal["grid", "list"] = "grid"
    show_preview_in_lists: bool = True
    posts_per_page: int = 12
    pagination_type: Literal["prev_next", "numbered"] = "prev_next"
    toc_enabled: bool = True

    class Config:
        from_attributes = True