from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class DomainIn(BaseModel):
    hostname: str


class DomainOut(BaseModel):
    hostname: Optional[str] = Field(None, alias="custom_domain")
    domain_status: str
    verified_at: Optional[datetime] = None
    grace_started_at: Optional[datetime] = None
    grace_expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class DomainVerifyOut(BaseModel):
    verification_status: str
    domain_status: str


class DomainLookupOut(BaseModel):
    username: str
    domain_status: str
