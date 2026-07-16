"""
routers/forecast.py — Forecast endpoints.

GET /analytics/forecast/sales   — sales revenue forecast (tasks 5.1)
GET /analytics/forecast/demand  — per-product demand forecast (task 5.2)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request

from models.schemas import DemandResponse, SalesForecastResponse
from services import data_pipeline, demand as demand_svc, forecasting
from services.openai_client import OpenAIServiceError, generate_insight

router = APIRouter()

_FALLBACK_INSIGHT = "AI insight temporarily unavailable."

# ---------------------------------------------------------------------------
# GET /analytics/forecast/sales
# ---------------------------------------------------------------------------

@router.get("/sales", response_model=SalesForecastResponse)
async def get_sales_forecast(
    request: Request,
    branch_id: str = Query(...),
    horizon_days: int = Query(...),
    start_date: str | None = Query(default=None),
):
    """
    Return a sales revenue forecast for the given branch.

    horizon_days must be 7 or 30.
    """
    if horizon_days not in (7, 30):
        raise HTTPException(status_code=400, detail="horizon_days must be 7 or 30")

    business_id = request.headers.get("X-Business-ID", "")

    # Fetch data
    df, data_quality_warning = await data_pipeline.get_daily_sales(branch_id, business_id)

    # Run forecast
    forecast_points = forecasting.forecast_sales(df, horizon_days)

    # Build context for insight
    forecast_summary = (
        f"{len(forecast_points)} day forecast; "
        f"total predicted revenue: {sum(p.predicted_revenue for p in forecast_points):.2f}"
    )
    context = {"forecast_summary": forecast_summary, "horizon_days": horizon_days}
    template = (
        "Summarize this sales forecast in one paragraph: {forecast_summary}. "
        "Horizon: {horizon_days} days."
    )

    try:
        insight = await generate_insight(context, template)
    except OpenAIServiceError:
        insight = _FALLBACK_INSIGHT

    return SalesForecastResponse(
        forecast=forecast_points,
        insight=insight,
        data_quality_warning=data_quality_warning,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /analytics/forecast/demand
# ---------------------------------------------------------------------------

@router.get("/demand", response_model=DemandResponse)
async def get_demand_forecast(
    request: Request,
    branch_id: str = Query(...),
    horizon_days: int = Query(...),
    product_id: str | None = Query(default=None),
):
    """
    Return per-product demand forecasts for the given branch.

    horizon_days must be 7 or 30.
    """
    if horizon_days not in (7, 30):
        raise HTTPException(status_code=400, detail="horizon_days must be 7 or 30")

    business_id = request.headers.get("X-Business-ID", "")

    # Fetch product sales data
    product_df = await data_pipeline.get_product_sales(branch_id, business_id)

    # Filter by product_id if provided
    if product_id and not product_df.empty:
        product_df = product_df[product_df["product_id"] == product_id]

    # Run demand forecast
    forecasts = demand_svc.forecast_demand(product_df, horizon_days)

    # Build context for insight
    top_products = [f.product_name for f in forecasts[:3]]
    demand_summary = (
        f"Top products by predicted demand: {', '.join(top_products) if top_products else 'none'}. "
        f"Total products forecasted: {len(forecasts)}."
    )
    context = {"demand_summary": demand_summary}
    template = (
        "Identify top 3 products by predicted demand and any declining products: {demand_summary}"
    )

    try:
        insight = await generate_insight(context, template)
    except OpenAIServiceError:
        insight = _FALLBACK_INSIGHT

    return DemandResponse(
        forecasts=forecasts,
        insight=insight,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
