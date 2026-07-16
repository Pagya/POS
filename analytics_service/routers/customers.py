"""
routers/customers.py — Customer analytics endpoints.

GET /analytics/customers/segmentation — new vs repeat customer segmentation (task 5.3)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Query, Request

from models.schemas import DateRange, SegmentationSummary
from services import data_pipeline, segmentation as seg_svc
from services.openai_client import OpenAIServiceError, generate_insight

router = APIRouter()

_FALLBACK_INSIGHT = "AI insight temporarily unavailable."


@router.get("/segmentation", response_model=SegmentationSummary)
async def get_segmentation(
    request: Request,
    branch_id: str = Query(...),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
):
    """
    Return customer segmentation summary (new vs repeat) for the given branch.
    """
    business_id = request.headers.get("X-Business-ID", "")

    # Build optional date range
    date_range: DateRange | None = None
    if start_date and end_date:
        date_range = DateRange(start_date=start_date, end_date=end_date)

    # Fetch customer transaction data
    tx_df = await data_pipeline.get_customer_transactions(branch_id, business_id)

    # Run segmentation
    result = seg_svc.segment_customers(tx_df, date_range)

    # Build context for insight
    summary = (
        f"Total customers: {result.total_customers}, "
        f"new: {result.new_customers.count}, "
        f"repeat: {result.repeat_customers.count}."
    )
    context = {
        "repeat_rate": result.repeat_purchase_rate,
        "summary": summary,
    }
    template = (
        "Comment on repeat purchase rate of {repeat_rate:.1%} and suggest retention "
        "actions if below 30%: {summary}"
    )

    try:
        insight = await generate_insight(context, template)
    except OpenAIServiceError:
        insight = _FALLBACK_INSIGHT

    # Fill in the fields the service left blank
    result.insight = insight
    result.generated_at = datetime.now(timezone.utc).isoformat()

    return result
