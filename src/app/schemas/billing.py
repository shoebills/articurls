from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid


class SubscriptionOut(BaseModel):
    subscription_id: uuid.UUID
    plan_type: str
    status: str
    tier: Optional[str] = None
    billing_cycle: Optional[str] = None
    pending_tier: Optional[str] = None
    pending_billing_cycle: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
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


class CheckoutRequest(BaseModel):
    plan: str = "pro"
    tier: Optional[str] = None
    billing_cycle: str = "monthly"


class ChangePlanRequest(BaseModel):
    tier: str
    billing_cycle: str = "monthly"


class ChangePlanResponse(BaseModel):
    applied: bool
    scheduled: bool
    effective_date: Optional[datetime] = None


class CustomerPortalResponse(BaseModel):
    url: str


class SiteUsageItem(BaseModel):
    site_id: uuid.UUID
    subdomain: str
    site_name: Optional[str] = None
    pageviews: int = 0


class AccountUsage(BaseModel):
    total_pageviews: int = 0
    tier_limit: Optional[int] = 10000
    plan_type: str = "pro"
    tier_price_usd: int = 19
    billing_cycle: Optional[str] = None
    usage_percentage: Optional[float] = 0.0
    sites: list[SiteUsageItem] = []