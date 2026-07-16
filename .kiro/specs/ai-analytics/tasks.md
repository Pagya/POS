# Tasks: AI-Powered Analytics

## Task List

- [x] 1. Analytics_Service — Project Scaffold and Infrastructure
  - [x] 1.1 Create `analytics_service/` directory with `main.py`, `config.py`, `db.py`, `cache.py`, and `requirements.txt` (fastapi, uvicorn, asyncpg, prophet, openai, cachetools, bleach, pandas, hypothesis)
  - [x] 1.2 Implement `config.py` — load `DATABASE_URL`, `READ_ONLY_DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`), `ANALYTICS_PORT` (default 8001), `CACHE_TTL_SECONDS` (default 900), `PROXY_ORIGIN` from environment
  - [x] 1.3 Implement `db.py` — asyncpg read-only connection pool using `READ_ONLY_DATABASE_URL`; expose `get_pool()` and `fetch()` helpers
  - [x] 1.4 Implement `cache.py` — in-memory TTL cache keyed by `"{business_id}:{branch_id}:{data_type}"`; expose `get()`, `set()`, and `invalidate()` functions using `cachetools.TTLCache`
  - [x] 1.5 Implement `main.py` — FastAPI app with CORS restricted to `PROXY_ORIGIN`, register all routers, expose `GET /health` returning `{ status, models: { forecasting, demand } }`
  - [x] 1.6 Implement `models/schemas.py` — all Pydantic request/response models: `ForecastPoint`, `ConfidenceInterval`, `SalesForecastResponse`, `DemandForecast`, `DemandResponse`, `SegmentationSummary`, `CustomerSegment`, `WeeklySegment`, `BestSellerItem`, `BestSellersResponse`, `RestockItem`, `RestockResponse`, `NLQueryRequest`, `NLQueryResponse`

- [x] 2. Analytics_Service — Data Pipeline
  - [x] 2.1 Implement `services/data_pipeline.py` — `get_daily_sales(branch_id, business_id)`: queries `transactions` table filtered by `branch_id`, `business_id`, and `status='success'`; aggregates daily totals; returns pandas DataFrame
  - [x] 2.2 Implement `get_product_sales(branch_id, business_id)` in `data_pipeline.py` — queries `stock_logs` filtered by `branch_id`, `action_type='SALE'`; aggregates per-product quantity; returns DataFrame
  - [x] 2.3 Implement `get_customer_transactions(branch_id, business_id)` in `data_pipeline.py` — queries `transactions` grouped by customer identifier per `branch_id`; returns DataFrame
  - [x] 2.4 Implement `get_products_with_stock(branch_id, business_id)` in `data_pipeline.py` — queries `products` table for `stock_quantity` and `reorder_level` per branch
  - [x] 2.5 Implement cache integration in `data_pipeline.py` — wrap each extraction function with cache lookup/store using `cache.py`; add `data_quality_warning` field when fewer than 30 days of transaction records are returned
  - [x] 2.6 Implement `branch_id='all'` aggregation path in `data_pipeline.py` — when `branch_id='all'`, query all branches for the `business_id` and return both aggregated and per-branch DataFrames

- [x] 3. Analytics_Service — ML Models
  - [x] 3.1 Implement `services/forecasting.py` — `forecast_sales(daily_df, horizon_days)`: fits Prophet on `ds`/`y` columns; falls back to ARIMA if Prophet fails; returns `list[ForecastPoint]` with `confidence_interval` where `lower <= predicted_revenue <= upper`
  - [x] 3.2 Implement `services/demand.py` — `forecast_demand(product_df, horizon_days)`: per-product Prophet forecast; uses moving average for products with < 14 days history; returns `list[DemandForecast]` sorted by `predicted_quantity` DESC; adds `data_quality_warning` for short-history products
  - [x] 3.3 Implement `services/segmentation.py` — `segment_customers(tx_df, date_range)`: classifies customers as `new` (tx_count == 1 in business) or `repeat` (tx_count > 1); computes `repeat_purchase_rate`; returns `SegmentationSummary` with weekly breakdown

- [x] 4. Analytics_Service — OpenAI Client
  - [x] 4.1 Implement `services/openai_client.py` — `generate_insight(context, prompt_template)`: calls OpenAI Chat Completions with 10-second timeout; raises `OpenAIServiceError` on failure or timeout; never returns partial/fabricated answers
  - [x] 4.2 Implement `answer_nl_query(question, data_summary)` in `openai_client.py` — sanitizes `question` using `bleach.clean()` and truncates to 500 chars; constructs structured prompt; returns `NLQueryResponse`; raises `OpenAIServiceError` on failure
  - [x] 4.3 Implement NL query logging in `openai_client.py` — log question text, `branch_id`, response latency, and success/failure to application logger; do NOT log full OpenAI response body

- [x] 5. Analytics_Service — API Routers
  - [x] 5.1 Implement `routers/forecast.py` — `GET /analytics/forecast/sales`: validates `branch_id`, `horizon_days` (must be 7 or 30); calls data pipeline + forecasting service + OpenAI insight; returns `SalesForecastResponse` with `generated_at`
  - [x] 5.2 Implement `GET /analytics/forecast/demand` in `routers/forecast.py` — validates params; calls data pipeline + demand service + OpenAI insight; returns `DemandResponse`
  - [x] 5.3 Implement `routers/customers.py` — `GET /analytics/customers/segmentation`: validates `branch_id` and optional `date_range`; calls data pipeline + segmentation service + OpenAI insight; returns `SegmentationSummary`
  - [x] 5.4 Implement `routers/recommendations.py` — `GET /analytics/recommendations/best-sellers`: validates `branch_id`, `limit` (default 10, max 50), `period_days` (default 30); returns `BestSellersResponse`
  - [x] 5.5 Implement `GET /analytics/recommendations/restock` in `routers/recommendations.py` — validates `branch_id`, `horizon_days` (default 7); combines stock data with demand forecast; assigns urgency tiers; sorts by urgency then `predicted_demand` DESC; returns `RestockResponse`
  - [x] 5.6 Implement `routers/query.py` — `POST /analytics/query`: validates `NLQueryRequest`; calls `answer_nl_query`; returns `NLQueryResponse`; returns HTTP 503 on `OpenAIServiceError`
  - [x] 5.7 Add branch-to-business validation middleware in `main.py` — for every request, verify `branch_id` (from query params or body) belongs to `business_id` from `X-Business-ID` header; return 403 if not

- [x] 6. Analytics_Proxy — Node.js Extension
  - [x] 6.1 Create `backend/src/modules/analytics/analytics.proxy.js` — replace existing `analytics.routes.js`; register `authMiddleware` + `requirePermission('reports:read')` on all routes under `/api/analytics/`
  - [x] 6.2 Implement `branchScopeGuard` middleware in `analytics.proxy.js` — reject `branch_id='all'` for non-owner roles with HTTP 403
  - [x] 6.3 Implement `forwardToService` in `analytics.proxy.js` — proxies request to `http://localhost:${ANALYTICS_SERVICE_PORT}/analytics/*` with `X-Business-ID`, `X-Branch-ID`, `X-User-Role` headers; returns HTTP 503 on connection failure or timeout
  - [x] 6.4 Implement response envelope wrapping in `analytics.proxy.js` — wrap all Analytics_Service responses in `{ data, error, meta: { generated_at, page, limit, total } }` structure
  - [x] 6.5 Implement pagination support in `analytics.proxy.js` — forward `page` and `limit` query params; enforce `limit <= 100`; populate `meta.total`, `meta.page`, `meta.limit` from service response
  - [x] 6.6 Update `backend/src/index.js` — replace `app.use('/analytics', ...)` with `app.use('/api/analytics', require('./modules/analytics/analytics.proxy'))`; add `GET /api/analytics/health` (no auth required)

- [x] 7. Analytics_Dashboard — Next.js UI
  - [x] 7.1 Refactor `src/app/analytics/page.tsx` — add route guard checking `reports:read` permission; redirect to `/dashboard` if absent; add cross-branch toggle for owner role; read `branch_id` from branch context; re-fetch all sections on branch change
  - [x] 7.2 Create `src/app/analytics/components/LoadingSkeleton.tsx` — reusable skeleton component for each dashboard section
  - [x] 7.3 Create `src/app/analytics/components/DataQualityNotice.tsx` — inline notice component that renders `data_quality_warning` message
  - [x] 7.4 Create `src/app/analytics/components/SalesForecastSection.tsx` — line chart with confidence interval bands (Recharts `AreaChart`); displays AI insight below chart; shows `DataQualityNotice` if warning present
  - [x] 7.5 Create `src/app/analytics/components/DemandSection.tsx` — bar chart grouped by product (Recharts `BarChart`); displays AI insight; shows per-product `DataQualityNotice`
  - [x] 7.6 Create `src/app/analytics/components/SegmentationSection.tsx` — donut chart (Recharts `PieChart`) for new vs repeat summary; stacked bar chart for weekly breakdown; displays AI insight
  - [x] 7.7 Create `src/app/analytics/components/BestSellersSection.tsx` — ranked table with revenue and quantity columns; displays AI insight
  - [x] 7.8 Create `src/app/analytics/components/RestockSection.tsx` — table with urgency badges (critical/high/medium color-coded); displays AI insight
  - [x] 7.9 Create `src/app/analytics/components/NLQuerySection.tsx` — text input (max 500 chars) + submit button; renders `answer` as formatted text; renders chart if `chart_data` present; shows error state on failure
  - [x] 7.10 Add branch comparison bar chart to `page.tsx` — renders when cross-branch data is returned (owner + `branch_id='all'`); shows each branch's contribution to aggregated metric

- [x] 8. Property-Based Tests — Analytics_Service (Python/Hypothesis)
  - [x] 8.1 Write property test for P2: only status='success' transactions included in extracted data
  - [x] 8.2 Write property test for P3: daily sales aggregation equals manual sum per day per branch
  - [x] 8.3 Write property test for P4: only action_type='SALE' stock_logs included in product sales data
  - [x] 8.4 Write property test for P5: all returned records have branch_id matching the requested branch
  - [x] 8.5 Write property test for P6: two identical requests within TTL return same data (cache hit)
  - [x] 8.6 Write property test for P7: data_quality_warning present iff < 30 days of transaction records
  - [x] 8.7 Write property test for P8: forecast points have valid schema and lower <= predicted_revenue <= upper
  - [x] 8.8 Write property test for P9: all analytics responses include non-empty insight string
  - [x] 8.9 Write property test for P10: demand response items have required fields and are sorted by predicted_quantity DESC
  - [x] 8.10 Write property test for P11: products with < 14 days history have non-null data_quality_warning
  - [x] 8.11 Write property test for P12: segmentation math invariants (new + repeat = total, percentages sum to 100, weekly sums match)
  - [x] 8.12 Write property test for P13: customer classification correctness (count=1 → new, count>1 → repeat)
  - [x] 8.13 Write property test for P14: best-sellers schema, descending order, SALE-only source
  - [x] 8.14 Write property test for P15: restock urgency assignment and sort order (critical > high > medium > predicted_demand DESC)
  - [x] 8.15 Write property test for P16: restock inclusion criterion (stock < reorder_level OR stock < predicted_demand)
  - [x] 8.16 Write property test for P17: NL query sanitization removes HTML tags and truncates to 500 chars
  - [x] 8.17 Write property test for P18: NL query response schema (answer non-empty, query_interpreted non-empty, valid ISO 8601 generated_at)
  - [x] 8.18 Write property test for P20: cross-branch response per-branch breakdown count equals number of branches in business
  - [x] 8.19 Write property test for P23: branch_id not in business returns 403
  - [x] 8.20 Write property test for P26: missing required params or invalid horizon_days returns 400

- [x] 9. Property-Based Tests — Analytics_Proxy (TypeScript/fast-check)
  - [x] 9.1 Write property test for P1: valid requests always have X-Business-ID, X-Branch-ID, X-User-Role forwarded
  - [x] 9.2 Write property test for P19: branch_id='all' with non-owner role always returns 403
  - [x] 9.3 Write property test for P21: any request without reports:read returns 403
  - [x] 9.4 Write property test for P22: any request without valid JWT returns 401
  - [x] 9.5 Write property test for P24: all proxy responses conform to {data, error, meta} envelope with valid ISO 8601 generated_at
  - [x] 9.6 Write property test for P25: paginated requests with limit > 100 return at most 100 records

- [x] 10. Unit Tests
  - [x] 10.1 Write Analytics_Service unit tests (pytest): health endpoint, CORS rejection, 400 on missing params, 400 on invalid horizon_days, 403 on branch-not-in-business, 503 on OpenAI failure, 503 on OpenAI timeout
  - [x] 10.2 Write Analytics_Proxy unit tests (Jest): 401 without JWT, 403 without reports:read, 403 for branch_id=all non-owner, 503 on service unavailable, correct X-headers forwarded, envelope wrapping
  - [x] 10.3 Write Analytics_Dashboard unit tests (Vitest + RTL): redirect for unauthenticated user, redirect for user without reports:read, 6 sections render with loading skeletons, data_quality_warning renders as inline notice, branch change triggers re-fetch, owner sees cross-branch toggle
