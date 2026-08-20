from pydantic import BaseModel, field_validator
from typing import List, Literal, Optional, Union
from datetime import datetime
from .. import models


class UserPageBase(BaseModel):
    title: str = ""
    content: str = ""


class UserPageCreate(UserPageBase):
    slug: Optional[str] = None


class UserPageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    slug: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    show_in_footer: Optional[bool] = None


class PageMediaOut(BaseModel):
    media_id: int
    url: str
    sort_order: int

    class Config:
        from_attributes = True


class UserPageStatusUpdate(BaseModel):
    status: models.PageStatus


class UserPageOut(UserPageBase):
    page_id: int
    user_id: int
    slug: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    status: models.PageStatus
    published_at: Optional[datetime] = None
    show_in_footer: bool
    footer_order: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserPageMenuUpdate(BaseModel):
    ordered_page_ids: List[Union[int, str]]

    @field_validator("ordered_page_ids", mode="before")
    @classmethod
    def ensure_list(cls, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("ordered_page_ids must be a list")
        return value


class DesignSettings(BaseModel):
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
    show_about_section: bool
    site_footer_enabled: bool = True
    featured_blogs_enabled: bool = True
    featured_blog_ids: list[int] | None = []
    content_width: Literal["narrow", "wide"] = "wide"
    list_image_position: Literal["above_title", "next_to_title"] = "above_title"
    show_preview_in_lists: bool = True
    about_title: Optional[str] = None