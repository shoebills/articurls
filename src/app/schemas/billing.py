from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid


class SubscriptionOut(BaseModel):
    subscription_id: uuid.UUID
    plan_type: str
    status: str
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    transaction_id: uuid.UUID
    amount: int
    currency: str
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class CheckoutResponse(BaseModel):
    checkout_url: str


class CustomerPortalResponse(BaseModel):
    url: str


class SiteUsageItem(BaseModel):
    site_id: uuid.UUID
    subdomain: str
    nav_blog_name: Optional[str] = None
    pageviews: int = 0


class AccountUsage(BaseModel):
    total_pageviews: int = 0
    tier_limit: int = 10000
    plan_type: str = "trial"
    tier_price_usd: int = 9
    usage_percentage: float = 0.0
    sites: list[SiteUsageItem] = []