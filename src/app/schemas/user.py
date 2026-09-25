from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Literal
import re
import uuid


class CreateUser(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserSettings(BaseModel):
    user_id: uuid.UUID
    name: str
    subdomain: str
    email: EmailStr
    google_id: Optional[str] = None
    has_password: bool = False
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    profile_image_url: Optional[str] = None

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
    site_name: Optional[str] = None
    nav_menu_enabled: bool
    nav_items: Optional[list[dict]] = None
    logo_url: Optional[str] = None
    logo_link: Optional[str] = "/"
    search_enabled: bool = True
    theme_toggle_enabled: bool = True

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
    newsletter_webhook_token: Optional[str] = None

    is_admin: bool = False
    favicon_url: Optional[str] = None
    og_image_url: Optional[str] = None
    featured_blogs_enabled: bool = True
    featured_blog_ids: list[str] | None = []
    custom_domain: Optional[str] = None
    content_layout: Literal["grid", "list"] = "grid"
    show_preview_in_lists: bool = True
    posts_per_page: int = 12
    pagination_type: Literal["prev_next", "numbered"] = "prev_next"
    toc_enabled: bool = True
    domain_status: Optional[str] = None
    rss_enabled: bool = False
    atom_enabled: bool = False
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None

    seo_indexing_enabled: bool = True
    seo_noindex_categories: bool = False
    seo_noindex_authors: bool = False
    seo_noindex_pages: bool = False
    seo_trailing_slash_listings: bool = False
    seo_trailing_slash_jsonld: bool = False
    seo_sitemap_enabled: bool = True
    seo_robots_mode: Literal["auto", "custom"] = "auto"
    seo_robots_custom: Optional[str] = None
    seo_llms_mode: Literal["auto", "custom"] = "auto"
    seo_llms_custom: Optional[str] = None

    ga_measurement_id: Optional[str] = None
    adsense_publisher_id: Optional[str] = None
    search_console_property: Optional[str] = None
    search_console_verification_token: Optional[str] = None

    class Config:
        from_attributes = True
        

class PasswordUpdate(BaseModel):
    new_password: str = Field(..., min_length=8)


class UpdateUser(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    profile_image_url: Optional[str] = None


class UpdateProUser(BaseModel):
    navbar_enabled: Optional[bool] = None
    site_name: Optional[str] = None
    nav_menu_enabled: Optional[bool] = None
    favicon_url: Optional[str] = None


class SeoSettings(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image_url: Optional[str] = None
    rss_enabled: bool = False
    seo_indexing_enabled: bool = True
    seo_noindex_categories: bool = False
    seo_noindex_authors: bool = False
    seo_noindex_pages: bool = False
    seo_trailing_slash_listings: bool = False
    seo_trailing_slash_jsonld: bool = False
    seo_sitemap_enabled: bool = True
    seo_robots_mode: Literal["auto", "custom"] = "auto"
    seo_robots_custom: Optional[str] = None
    seo_llms_mode: Literal["auto", "custom"] = "auto"
    seo_llms_custom: Optional[str] = None

    class Config:
        from_attributes = True


class SeoSettingsUpdate(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image_url: Optional[str] = None
    rss_enabled: Optional[bool] = None
    seo_indexing_enabled: Optional[bool] = None
    seo_noindex_categories: Optional[bool] = None
    seo_noindex_authors: Optional[bool] = None
    seo_noindex_pages: Optional[bool] = None
    seo_trailing_slash_listings: Optional[bool] = None
    seo_trailing_slash_jsonld: Optional[bool] = None
    seo_sitemap_enabled: Optional[bool] = None
    seo_robots_mode: Optional[Literal["auto", "custom"]] = None
    seo_robots_custom: Optional[str] = Field(None, max_length=10000)
    seo_llms_mode: Optional[Literal["auto", "custom"]] = None
    seo_llms_custom: Optional[str] = Field(None, max_length=10000)


class IntegrationsSettings(BaseModel):
    ga_measurement_id: Optional[str] = None
    adsense_publisher_id: Optional[str] = None
    search_console_property: Optional[str] = None
    search_console_verification_token: Optional[str] = None

    class Config:
        from_attributes = True


_GA_ID_RE = re.compile(r"^G-[A-Z0-9]+$")
_ADSENSE_ID_RE = re.compile(r"^pub-\d{16}$")
_ADSENSE_CA_ID_RE = re.compile(r"^ca-pub-\d{16}$")
_GSC_TOKEN_RE = re.compile(r"^[A-Za-z0-9_\-]{10,200}$")


class IntegrationsSettingsUpdate(BaseModel):
    ga_measurement_id: Optional[str] = None
    adsense_publisher_id: Optional[str] = None
    search_console_property: Optional[str] = None
    search_console_verification_token: Optional[str] = None

    @field_validator("ga_measurement_id", mode="before")
    @classmethod
    def _normalize_ga(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if not v:
            return None
        v = v.upper()
        if not _GA_ID_RE.match(v):
            raise ValueError("Invalid GA4 measurement ID — expected G- followed by letters and numbers")
        return v

    @field_validator("adsense_publisher_id", mode="before")
    @classmethod
    def _normalize_adsense(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if not v:
            return None
        if _ADSENSE_CA_ID_RE.match(v):
            v = v[3:]
        if not _ADSENSE_ID_RE.match(v):
            raise ValueError("Invalid AdSense publisher ID — expected pub- followed by 16 digits")
        return v

    @field_validator("search_console_property", mode="before")
    @classmethod
    def _normalize_gsc_property(cls, v):
        if v is None:
            return v
        return str(v).strip() or None

    @field_validator("search_console_verification_token", mode="before")
    @classmethod
    def _normalize_gsc_token(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if not v:
            return None
        if not _GSC_TOKEN_RE.match(v):
            raise ValueError("Invalid Search Console verification token")
        return v


class StorageUsage(BaseModel):
    used_bytes: int
    limit_bytes: Optional[int] = None
    is_unlimited: bool = False

