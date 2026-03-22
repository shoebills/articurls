from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SubscriptionOut(BaseModel):
    subscription_id: int
    plan_type: str
    status: str
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    transaction_id: int
    amount: int
    currency: str
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class CheckoutResponse(BaseModel):
    checkout_url: str