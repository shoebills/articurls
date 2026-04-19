from pydantic import BaseModel, EmailStr
from typing import Optional, Literal


class CreateUser(BaseModel):
    name: str
    user_name: str
    email: EmailStr
    password: str
    plan_choice: Literal["free", "pro"] = "free" 


class UserSettings(BaseModel):
    user_id: int
    name: str
    user_name: str
    email: EmailStr
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    bio: Optional[str] = None
    link: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    profile_image_url: Optional[str] = None

    verification_tick: bool
    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: bool
    footer_enabled: bool

    class Config:
        from_attributes = True
        

class PublicUser(BaseModel):
    name: str
    user_name: str
    seo_title: str
    seo_description: str
    bio: Optional[str] = None
    link: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    profile_image_url: Optional[str] = None
    verification_tick: bool
    navbar_enabled: bool
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: bool
    footer_enabled: bool
    show_articurls_watermark: bool = True

    class Config:
        from_attributes = True


class UpdateUser(BaseModel):
    name: Optional[str] = None
    user_name: Optional[str] = None
    email: Optional[EmailStr] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    bio: Optional[str] = None
    link: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    instagram_link: Optional[str] = None
    x_link: Optional[str] = None
    pinterest_link: Optional[str] = None
    facebook_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    github_link: Optional[str] = None
    profile_image_url: Optional[str] = None


class UpdateProUser(BaseModel):
    verification_tick: Optional[bool] = None
    navbar_enabled: Optional[bool] = None
    nav_blog_name: Optional[str] = None
    nav_menu_enabled: Optional[bool] = None


class MonetizationSettings(BaseModel):
    ads_enabled: bool
    ad_code: Optional[str] = None
    ad_frequency: int = 3

    class Config:
        from_attributes = True


class MonetizationSettingsUpdate(BaseModel):
    ads_enabled: Optional[bool] = None
    ad_code: Optional[str] = None
    ad_frequency: Optional[int] = None


class SeoSettings(BaseModel):
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

    class Config:
        from_attributes = True


class SeoSettingsUpdate(BaseModel):
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None