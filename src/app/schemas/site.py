from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class SiteCreate(BaseModel):
    subdomain: str
    nav_blog_name: Optional[str] = None


class SiteUpdate(BaseModel):
    nav_blog_name: Optional[str] = None
    custom_head_code: Optional[str] = None
    custom_body_code: Optional[str] = None
    custom_css: Optional[str] = None


class SiteSummary(BaseModel):
    site_id: int
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
