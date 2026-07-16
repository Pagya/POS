"""
routers/query.py — Natural-language query endpoint.

POST /analytics/query — answer a free-text business question (task 5.6)
"""

from fastapi import APIRouter, HTTPException, Request

from models.schemas import NLQueryRequest, NLQueryResponse
from services.openai_client import OpenAIServiceError, answer_nl_query

router = APIRouter()


@router.post("/query", response_model=NLQueryResponse)
async def nl_query(request: Request, body: NLQueryRequest):
    """
    Accept a natural-language question about business data and return an
    AI-generated answer.

    Returns HTTP 503 if the OpenAI service is unavailable.
    """
    # Build a lightweight data summary to give the model context
    data_summary = {
        "branch_id": body.branch_id,
        "available_analytics": [
            "sales_forecast",
            "demand_forecast",
            "customer_segmentation",
            "best_sellers",
            "restock_recommendations",
        ],
    }

    try:
        result = await answer_nl_query(body.question, data_summary, body.branch_id)
    except OpenAIServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"AI service temporarily unavailable: {exc}",
        ) from exc

    return result
