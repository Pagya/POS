from typing import Literal

from pydantic import BaseModel, Field


class ConfidenceInterval(BaseModel):
    lower: float
    upper: float


class ForecastPoint(BaseModel):
    date: str  # ISO 8601
    predicted_revenue: float
    confidence_interval: ConfidenceInterval


class SalesForecastResponse(BaseModel):
    forecast: list[ForecastPoint]
    insight: str
    data_quality_warning: str | None
    generated_at: str  # ISO 8601


class DemandForecast(BaseModel):
    product_id: str
    product_name: str
    predicted_quantity: float
    confidence_interval: ConfidenceInterval
    data_quality_warning: str | None


class DemandResponse(BaseModel):
    forecasts: list[DemandForecast]  # sorted by predicted_quantity DESC
    insight: str
    generated_at: str


class CustomerSegment(BaseModel):
    count: int
    percentage: float


class WeeklySegment(BaseModel):
    week_start: str
    new_count: int
    repeat_count: int


class SegmentationSummary(BaseModel):
    total_customers: int
    new_customers: CustomerSegment
    repeat_customers: CustomerSegment
    repeat_purchase_rate: float
    weekly_breakdown: list[WeeklySegment]
    insight: str
    generated_at: str


class BestSellerItem(BaseModel):
    rank: int
    product_id: str
    product_name: str
    total_quantity_sold: int
    total_revenue: float


class BestSellersResponse(BaseModel):
    items: list[BestSellerItem]
    insight: str
    generated_at: str


class RestockItem(BaseModel):
    product_id: str
    product_name: str
    current_stock: int
    reorder_level: int
    predicted_demand: float
    suggested_restock_quantity: int
    urgency: Literal["critical", "high", "medium"]


class RestockResponse(BaseModel):
    items: list[RestockItem]  # sorted: critical > high > medium, then predicted_demand DESC
    insight: str
    generated_at: str


class NLQueryRequest(BaseModel):
    question: str = Field(max_length=500)
    branch_id: str


class NLQueryResponse(BaseModel):
    answer: str
    chart_data: dict | None
    query_interpreted: str
    generated_at: str


class DateRange(BaseModel):
    start_date: str  # ISO 8601
    end_date: str  # ISO 8601
