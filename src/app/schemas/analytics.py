from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class MetricsRow(BaseModel):
    x: str
    y: int
    status: Optional[str] = None


class UmamiOverview(BaseModel):
    pageviews: int
    visitors: int
    visits: Optional[int] = None
    bounce_rate: Optional[float] = None
    avg_visit_time: Optional[int] = None


class UmamiOverviewResponse(BaseModel):
    period: str
    overview: UmamiOverview
    change: Optional[Dict[str, float]] = None


class UmamiTimeseriesItem(BaseModel):
    x: str
    t: Optional[str] = None
    y: int


class UmamiTimeseriesResponse(BaseModel):
    period: str
    unit: str
    pageviews: List[UmamiTimeseriesItem]
    visitors: List[UmamiTimeseriesItem]


class UmamiPagesResponse(BaseModel):
    period: str
    rows: List[MetricsRow]


class UmamiSourcesResponse(BaseModel):
    period: str
    referrers: List[MetricsRow]


class UmamiGeoResponse(BaseModel):
    period: str
    countries: List[MetricsRow]


class UmamiTechResponse(BaseModel):
    period: str
    browsers: List[MetricsRow]
    os: List[MetricsRow]
    devices: List[MetricsRow]


class UmamiRealtimeResponse(BaseModel):
    active_visitors: int
    urls: Dict[str, int]
    countries: Dict[str, int]
    referrers: Dict[str, int]
    events: List[Dict[str, Any]]
