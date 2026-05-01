from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class DomainIn(BaseModel):
    hostname: str


class DNSRecord(BaseModel):
    type: str
    name: str
    value: str
    purpose: str  # "ownership" or "ssl"


class DomainOut(BaseModel):
    hostname: Optional[str] = Field(None, alias="custom_domain")
    domain_status: str
    verified_at: Optional[datetime] = None
    grace_started_at: Optional[datetime] = None
    grace_expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class DomainAddResponse(BaseModel):
    hostname: str
    domain_status: str
    dns_instructions: List[DNSRecord]


class DomainVerifyOut(BaseModel):
    verification_status: str
    domain_status: str
    dns_instructions: Optional[List[DNSRecord]] = None


class DomainLookupOut(BaseModel):
    username: str
    domain_status: str
