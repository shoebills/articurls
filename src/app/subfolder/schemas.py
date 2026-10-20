from typing import Optional

from pydantic import BaseModel


class SubfolderIn(BaseModel):
    custom_domain: str
    custom_subpath: str


class SubfolderOut(BaseModel):
    custom_domain: Optional[str] = None
    custom_subpath: Optional[str] = None
    is_active: bool = False