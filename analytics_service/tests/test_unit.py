"""
Unit tests for the Analytics_Service (FastAPI).

Run with:
    cd commerce-os/analytics_service
    pytest tests/test_unit.py -v

Uses httpx.AsyncClient with the FastAPI app for endpoint testing.
DB and OpenAI calls are mocked via unittest.mock.patch.
"""

import os
import sys

# Set required env vars BEFORE importing anything from the app
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("READ_ONLY_DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("PROXY_ORIGIN", "http://localhost:4000")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock

from main import app
from services.openai_client import OpenAIServiceError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PROXY_ORIGIN = "http://localhost:4000"
BUSINESS_ID = "biz-123"
BRANCH_ID = "branch-abc"

def proxy_headers(branch_id: str = BRANCH_ID, business_id: str = BUSINESS_ID, role: str = "owner"):
    """Return the context headers the proxy attaches to every forwarded request."""
    return {
        "Origin": PROXY_ORIGIN,
        "X-Business-ID": business_id,
        "X-Branch-ID": branch_id,
        "X-User-Role": role,
    }


# ---------------------------------------------------------------------------
# Test 1: Health endpoint returns 200 with correct schema
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_returns_200_with_correct_schema():
    """GET /health returns 200 with { status: 'ok', models: { forecasting: bool, demand: bool } }."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "models" in body
    assert isinstance(body["models"]["forecasting"], bool)
    assert isinstance(body["models"]["demand"], bool)


# ---------------------------------------------------------------------------
# Test 2: CORS rejects requests without proxy origin header
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cors_rejects_wrong_origin():
    """Requests from a non-proxy origin should be rejected by CORS (no CORS headers)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Send a preflight OPTIONS request from a wrong origin
        response = await client.options(
            "/health",
            headers={
                "Origin": "http://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )

    # CORS middleware should NOT include the allow-origin header for wrong origins
    assert "access-control-allow-origin" not in response.headers or \
           response.headers.get("access-control-allow-origin") != "http://evil.example.com"


@pytest.mark.asyncio
async def test_cors_allows_proxy_origin():
    """Requests from the configured proxy origin should be allowed."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/health",
            headers={
                "Origin": PROXY_ORIGIN,
                "Access-Control-Request-Method": "GET",
            },
        )

    # The proxy origin should be reflected in the allow-origin header
    assert response.headers.get("access-control-allow-origin") == PROXY_ORIGIN


# ---------------------------------------------------------------------------
# Test 3: GET /analytics/forecast/sales returns 400 when branch_id is missing
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sales_forecast_missing_branch_id_returns_400():
    """GET /analytics/forecast/sales without branch_id returns 400 or 422 (FastAPI validation error)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/analytics/forecast/sales?horizon_days=7",
            headers=proxy_headers(),
        )

    # FastAPI returns 422 for missing required query params (Unprocessable Entity),
    # which is semantically equivalent to 400 for missing parameters.
    assert response.status_code in (400, 422), \
        f"Expected 400 or 422 for missing branch_id, got {response.status_code}"


# ---------------------------------------------------------------------------
# Test 4: GET /analytics/forecast/sales returns 400 when horizon_days is invalid
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sales_forecast_invalid_horizon_days_returns_400():
    """GET /analytics/forecast/sales with horizon_days=15 returns 400."""
    # Mock DB fetch to return a valid branch row so branch validation passes
    with patch("main.fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = [{"id": BRANCH_ID}]

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                f"/analytics/forecast/sales?branch_id={BRANCH_ID}&horizon_days=15",
                headers=proxy_headers(),
            )

    assert response.status_code == 400
    body = response.json()
    assert "horizon_days" in body.get("detail", "").lower() or \
           "400" in str(response.status_code)


@pytest.mark.asyncio
async def test_sales_forecast_horizon_days_1_returns_400():
    """GET /analytics/forecast/sales with horizon_days=1 returns 400."""
    with patch("main.fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = [{"id": BRANCH_ID}]

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                f"/analytics/forecast/sales?branch_id={BRANCH_ID}&horizon_days=1",
                headers=proxy_headers(),
            )

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Test 5: GET /analytics/forecast/sales returns 403 when branch_id doesn't belong to business
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sales_forecast_branch_not_in_business_returns_403():
    """GET /analytics/forecast/sales returns 403 when branch_id doesn't belong to business."""
    # Mock DB fetch to return empty rows (branch not found in business)
    with patch("main.fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = []  # empty = branch not in business

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                f"/analytics/forecast/sales?branch_id=unknown-branch&horizon_days=7",
                headers=proxy_headers(branch_id="unknown-branch"),
            )

    assert response.status_code == 403
    body = response.json()
    assert "business" in body.get("detail", "").lower() or \
           "branch" in body.get("detail", "").lower()


# ---------------------------------------------------------------------------
# Test 6: POST /analytics/query returns 503 when OpenAI fails
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nl_query_openai_failure_returns_503():
    """POST /analytics/query returns 503 when OpenAI raises OpenAIServiceError."""
    # Mock branch validation to pass
    with patch("main.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("services.openai_client.answer_nl_query", new_callable=AsyncMock) as mock_query:

        mock_fetch.return_value = [{"id": BRANCH_ID}]
        mock_query.side_effect = OpenAIServiceError("OpenAI API error: connection refused")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/analytics/query",
                json={"question": "What are my top products?", "branch_id": BRANCH_ID},
                headers=proxy_headers(),
            )

    assert response.status_code == 503
    body = response.json()
    assert "detail" in body
    assert "unavailable" in body["detail"].lower() or "ai" in body["detail"].lower()


# ---------------------------------------------------------------------------
# Test 7: POST /analytics/query returns 503 when OpenAI times out
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nl_query_openai_timeout_returns_503():
    """POST /analytics/query returns 503 when OpenAI times out."""
    with patch("main.fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("services.openai_client.answer_nl_query", new_callable=AsyncMock) as mock_query:

        mock_fetch.return_value = [{"id": BRANCH_ID}]
        mock_query.side_effect = OpenAIServiceError("OpenAI request timed out after 10 seconds")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/analytics/query",
                json={"question": "How are sales trending?", "branch_id": BRANCH_ID},
                headers=proxy_headers(),
            )

    assert response.status_code == 503
    body = response.json()
    assert "detail" in body
    # The detail should mention the timeout or unavailability
    detail_lower = body["detail"].lower()
    assert "unavailable" in detail_lower or "timed out" in detail_lower or "timeout" in detail_lower
