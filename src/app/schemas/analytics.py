from pydantic import BaseModel
from typing import Optional, List, Dict


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
    change: Optional[Dict[str, Optional[float]]] = None


class UmamiTimeseriesPoint(BaseModel):
    x: str
    pageviews: int = 0
    visitors: int = 0


class UmamiTimeseriesResponse(BaseModel):
    period: str
    unit: str
    series: List[UmamiTimeseriesPoint]


class SubscribersSeriesPoint(BaseModel):
    x: str
    subscribed: int = 0


class SubscribersAnalyticsResponse(BaseModel):
    period: str
    unit: str
    current_subscribers: int
    subscribed: int
    series: List[SubscribersSeriesPoint]


class UmamiMetricsResponse(BaseModel):
    period: str
    type: str
    rows: List[MetricsRow]


class UmamiExpandedMetricsRow(BaseModel):
    name: str
    visitors: int = 0
    visits: int = 0
    pageviews: int = 0
    bounces: Optional[int] = 0
    totaltime: Optional[int] = 0


class UmamiExpandedMetricsResponse(BaseModel):
    period: str
    type: str
    rows: List[UmamiExpandedMetricsRow]


class UmamiRealtimeResponse(BaseModel):
    active_visitors: int
