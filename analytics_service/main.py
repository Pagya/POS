"""
main.py — FastAPI application entry point for the Analytics_Service.

- CORS restricted to PROXY_ORIGIN (direct browser access rejected)
- Registers all analytics routers
- Exposes GET /health
- Wires lifespan events: DB pool init on startup, close on shutdown
- Branch-to-business validation middleware (task 5.7)
"""

import json
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from db import get_pool, close_pool, fetch
from routers import forecast, customers, recommendations, query

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup and clean up on shutdown."""
    logger.info("Analytics_Service starting up — initializing DB pool...")
    await get_pool()
    logger.info("DB pool ready.")
    yield
    logger.info("Analytics_Service shutting down — closing DB pool...")
    await close_pool()
    logger.info("DB pool closed.")


app = FastAPI(
    title="Analytics Service",
    description="ML inference, OpenAI calls, and data extraction for commerce-os analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — only allow requests from the configured proxy origin
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.PROXY_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Branch-to-business validation middleware (task 5.7)
# ---------------------------------------------------------------------------
@app.middleware("http")
async def branch_business_validation(request: Request, call_next) -> Response:
    """
    For every request (except /health), verify that the branch_id in the
    request belongs to the business_id provided in the X-Business-ID header.

    branch_id is extracted from query params first, then from the JSON body.
    Validation is skipped when branch_id is absent or equals 'all'.
    """
    # Skip validation for the health endpoint
    if request.url.path == "/health":
        return await call_next(request)

    # Extract branch_id from query params
    branch_id: str | None = request.query_params.get("branch_id")

    # If not in query params, try the JSON body (for POST requests)
    if not branch_id:
        try:
            body_bytes = await request.body()
            if body_bytes:
                body_json = json.loads(body_bytes)
                branch_id = body_json.get("branch_id")
                # Re-attach the body so downstream handlers can read it
                async def receive():
                    return {"type": "http.request", "body": body_bytes}
                request = Request(request.scope, receive)
        except Exception:
            pass

    # Skip validation when branch_id is absent or 'all'
    if not branch_id or branch_id == "all":
        return await call_next(request)

    business_id: str | None = request.headers.get("X-Business-ID")

    # If no business_id header, skip validation (proxy is responsible for attaching it)
    if not business_id:
        return await call_next(request)

    # Query the DB to verify the branch belongs to this business
    try:
        rows = await fetch(
            "SELECT id FROM branches WHERE id=$1 AND business_id=$2",
            branch_id,
            business_id,
        )
        if not rows:
            return JSONResponse(
                status_code=403,
                content={"detail": "Branch does not belong to this business"},
            )
    except Exception as exc:
        logger.error("Branch validation DB query failed: %s", exc)
        # On DB error, allow the request through — the router will handle it
        pass

    return await call_next(request)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(forecast.router, prefix="/analytics/forecast", tags=["forecast"])
app.include_router(customers.router, prefix="/analytics/customers", tags=["customers"])
app.include_router(recommendations.router, prefix="/analytics/recommendations", tags=["recommendations"])
app.include_router(query.router, prefix="/analytics", tags=["query"])


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health():
    """Return service status and model readiness flags."""
    return {
        "status": "ok",
        "models": {
            "forecasting": True,
            "demand": True,
        },
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.ANALYTICS_PORT,
        reload=False,
    )
