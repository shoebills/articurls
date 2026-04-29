from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Union


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None


class CategoryOut(BaseModel):
    category_id: int
    user_id: int
    name: str
    slug: str
    blog_count: int = 0
    show_in_menu: bool
    menu_order: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryMenuUpdate(BaseModel):
    ordered_category_ids: List[Union[int, str]]


class BlogCategoryAssign(BaseModel):
    category_ids: List[int]
