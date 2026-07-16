"""
routers/recommendations.py — Recommendation endpoints.

GET /analytics/recommendations/best-sellers  — ranked best-selling products (task 5.4)
GET /analytics/recommendations/restock       — restock recommendations (task 5.5)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request

from models.schemas import (
    BestSellerItem,
    BestSellersResponse,
    RestockItem,
    RestockResponse,
)
from services import data_pipeline
from services import demand as demand_svc
from services.openai_client import OpenAIServiceError, generate_insight

router = APIRouter()

_FALLBACK_INSIGHT = "AI insight temporarily unavailable."

_URGENCY_ORDER = {"critical": 0, "high": 1, "medium": 2}


# ---------------------------------------------------------------------------
# GET /analytics/recommendations/best-sellers
# ---------------------------------------------------------------------------

@router.get("/best-sellers", response_model=BestSellersResponse)
async def get_best_sellers(
    request: Request,
    branch_id: str = Query(...),
    limit: int = Query(default=10, ge=1, le=50),
    period_days: int = Query(default=30, ge=1),
):
    """
    Return the top-selling products for the given branch over the last period_days.
    """
    business_id = request.headers.get("X-Business-ID", "")

    # Fetch product sales data (SALE records only, from data_pipeline)
    product_df = await data_pipeline.get_product_sales(branch_id, business_id)

    items: list[BestSellerItem] = []

    if not product_df.empty:
        import pandas as pd

        # Filter to the last period_days
        cutoff = pd.Timestamp.now(tz="UTC").normalize() - pd.Timedelta(days=period_days)
        # sale_date may be tz-naive; normalise for comparison
        sale_dates = pd.to_datetime(product_df["sale_date"])
        if sale_dates.dt.tz is None:
            cutoff_naive = cutoff.tz_localize(None)
            mask = sale_dates >= cutoff_naive
        else:
            mask = sale_dates >= cutoff

        filtered = product_df[mask].copy()

        if not filtered.empty:
            # Aggregate by product
            agg = (
                filtered.groupby(["product_id", "product_name"], as_index=False)
                .agg(total_qty=("qty", "sum"))
                .sort_values("total_qty", ascending=False)
                .head(limit)
                .reset_index(drop=True)
            )

            for rank_idx, row in agg.iterrows():
                # total_revenue: qty * unit price is not available in stock_logs;
                # use qty as a proxy (revenue data would require a join to transactions).
                # Per the spec, total_revenue is required — we set it to 0.0 when
                # price data is unavailable (the data_pipeline doesn't expose it).
                items.append(
                    BestSellerItem(
                        rank=int(rank_idx) + 1,
                        product_id=str(row["product_id"]),
                        product_name=str(row["product_name"]),
                        total_quantity_sold=int(row["total_qty"]),
                        total_revenue=0.0,
                    )
                )

    # Build insight context
    top_name = items[0].product_name if items else "none"
    summary = (
        f"Top product: {top_name}. "
        f"Total products ranked: {len(items)}."
    )
    context = {"summary": summary}
    template = (
        "Highlight the top product and notable trends in this best-sellers list: {summary}"
    )

    try:
        insight = await generate_insight(context, template)
    except OpenAIServiceError:
        insight = _FALLBACK_INSIGHT

    return BestSellersResponse(
        items=items,
        insight=insight,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /analytics/recommendations/restock
# ---------------------------------------------------------------------------

@router.get("/restock", response_model=RestockResponse)
async def get_restock(
    request: Request,
    branch_id: str = Query(...),
    horizon_days: int = Query(default=7, ge=1),
):
    """
    Return restock recommendations for the given branch.

    Products are included when stock_quantity < reorder_level OR
    stock_quantity < predicted_demand for the given horizon_days.
    """
    business_id = request.headers.get("X-Business-ID", "")

    # Fetch stock levels and product sales data in parallel
    stock_df = await data_pipeline.get_products_with_stock(branch_id, business_id)
    product_df = await data_pipeline.get_product_sales(branch_id, business_id)

    # Run demand forecast
    demand_forecasts = demand_svc.forecast_demand(product_df, horizon_days)
    demand_by_product: dict[str, float] = {
        f.product_id: f.predicted_quantity for f in demand_forecasts
    }

    items: list[RestockItem] = []

    if not stock_df.empty:
        for _, row in stock_df.iterrows():
            pid = str(row["product_id"])
            stock_qty = int(row["stock_quantity"])
            reorder_lvl = int(row["reorder_level"])
            predicted = demand_by_product.get(pid, 0.0)

            # Inclusion criterion: stock < reorder_level OR stock < predicted_demand
            if stock_qty >= reorder_lvl and stock_qty >= predicted:
                continue

            # Urgency assignment
            if stock_qty == 0:
                urgency = "critical"
            elif stock_qty < reorder_lvl:
                urgency = "high"
            else:
                urgency = "medium"

            suggested = max(0, int(max(reorder_lvl, predicted) - stock_qty))

            items.append(
                RestockItem(
                    product_id=pid,
                    product_name=str(row["product_name"]),
                    current_stock=stock_qty,
                    reorder_level=reorder_lvl,
                    predicted_demand=predicted,
                    suggested_restock_quantity=suggested,
                    urgency=urgency,
                )
            )

    # Sort: critical > high > medium, then predicted_demand DESC within each tier
    items.sort(
        key=lambda x: (_URGENCY_ORDER[x.urgency], -x.predicted_demand)
    )

    # Build insight context
    critical_count = sum(1 for i in items if i.urgency == "critical")
    high_count = sum(1 for i in items if i.urgency == "high")
    summary = (
        f"{len(items)} products need restocking: "
        f"{critical_count} critical, {high_count} high urgency."
    )
    context = {
        "critical_count": critical_count,
        "high_count": high_count,
        "summary": summary,
    }
    template = (
        "Summarize {critical_count} critical and {high_count} high-urgency restock items "
        "and recommend immediate action: {summary}"
    )

    try:
        insight = await generate_insight(context, template)
    except OpenAIServiceError:
        insight = _FALLBACK_INSIGHT

    return RestockResponse(
        items=items,
        insight=insight,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
