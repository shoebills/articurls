from pydantic import BaseModel, field_validator
from typing import List, Optional, Union


class UserPageBase(BaseModel):
    title: str
    content: str = ""


class UserPageCreate(UserPageBase):
    pass


class UserPageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    slug: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class UserPageOut(UserPageBase):
    page_id: int
    user_id: int
    slug: str
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    show_in_footer: bool
    footer_order: Optional[int] = None

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
    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: bool
    footer_enabled: bool
    site_footer_enabled: bool = False
    featured_blogs_enabled: bool = False
    featured_blog_ids: list[int] | None = []