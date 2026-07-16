"""
data_pipeline.py — PostgreSQL extraction functions for the Analytics_Service.

All queries are parameterized and scoped to branch_id / business_id.
Results are cached in memory using cache.py (TTL: CACHE_TTL_SECONDS).

When branch_id='all', all branches for the business are queried and results
are returned as { "aggregated": DataFrame, "per_branch": { branch_id: DataFrame } }.
"""

import logging
from typing import Any

import pandas as pd

import cache
from db import fetch

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_branch_ids(business_id: str) -> list[str]:
    """Return all branch IDs belonging to the given business."""
    rows = await fetch(
        "SELECT id FROM branches WHERE business_id=$1",
        business_id,
    )
    return [str(row["id"]) for row in rows]


def _rows_to_df(rows: list[Any], columns: list[str]) -> pd.DataFrame:
    """Convert a list of asyncpg Records to a pandas DataFrame."""
    if not rows:
        return pd.DataFrame(columns=columns)
    return pd.DataFrame([dict(row) for row in rows], columns=columns)


# ---------------------------------------------------------------------------
# Task 2.1 — Daily sales
# ---------------------------------------------------------------------------

async def get_daily_sales(
    branch_id: str, business_id: str
) -> tuple[pd.DataFrame, str | None]:
    """
    Extract daily sales totals for a branch.

    When branch_id='all', aggregates across all branches and returns a dict:
        { "aggregated": DataFrame, "per_branch": { branch_id: (DataFrame, warning) } }

    Otherwise returns a tuple (DataFrame, warning_str | None).
    DataFrame columns: ds (datetime), y (float).
    Warning is set when fewer than 30 unique days are present.
    """
    if branch_id == "all":
        return await _get_daily_sales_all(business_id)

    # Cache lookup
    cached = cache.get(business_id, branch_id, "daily_sales")
    if cached is not None:
        return cached

    rows = await fetch(
        """
        SELECT date_trunc('day', created_at) AS ds, SUM(amount) AS y
        FROM transactions
        WHERE branch_id=$1 AND business_id=$2 AND status='success'
        GROUP BY 1
        ORDER BY 1
        """,
        branch_id,
        business_id,
    )

    df = _rows_to_df(rows, ["ds", "y"])
    if not df.empty:
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)

    warning: str | None = None
    if len(df) < 30:
        warning = "Insufficient historical data (< 30 days)"

    result = (df, warning)
    cache.set(business_id, branch_id, "daily_sales", result)
    return result


async def _get_daily_sales_all(business_id: str) -> dict:
    """Aggregate daily sales across all branches for the business."""
    branch_ids = await _get_branch_ids(business_id)

    per_branch: dict[str, tuple[pd.DataFrame, str | None]] = {}
    all_dfs: list[pd.DataFrame] = []

    for bid in branch_ids:
        df, warning = await get_daily_sales(bid, business_id)
        per_branch[bid] = (df, warning)
        if not df.empty:
            all_dfs.append(df)

    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)
        aggregated = (
            combined.groupby("ds", as_index=False)["y"]
            .sum()
            .sort_values("ds")
            .reset_index(drop=True)
        )
    else:
        aggregated = pd.DataFrame(columns=["ds", "y"])

    return {"aggregated": aggregated, "per_branch": per_branch}


# ---------------------------------------------------------------------------
# Task 2.2 — Product sales
# ---------------------------------------------------------------------------

async def get_product_sales(branch_id: str, business_id: str) -> pd.DataFrame | dict:
    """
    Extract per-product sales quantities for a branch.

    When branch_id='all', returns:
        { "aggregated": DataFrame, "per_branch": { branch_id: DataFrame } }

    Otherwise returns a DataFrame with columns:
        product_id, product_name, sale_date, qty
    """
    if branch_id == "all":
        return await _get_product_sales_all(business_id)

    cached = cache.get(business_id, branch_id, "product_sales")
    if cached is not None:
        return cached

    rows = await fetch(
        """
        SELECT sl.product_id,
               p.name AS product_name,
               sl.created_at::date AS sale_date,
               SUM(ABS(sl.quantity_delta)) AS qty
        FROM stock_logs sl
        JOIN products p ON sl.product_id = p.id
        WHERE sl.branch_id=$1 AND sl.action_type='SALE'
        GROUP BY 1, 2, 3
        ORDER BY 3
        """,
        branch_id,
    )

    df = _rows_to_df(rows, ["product_id", "product_name", "sale_date", "qty"])
    if not df.empty:
        df["product_id"] = df["product_id"].astype(str)
        df["sale_date"] = pd.to_datetime(df["sale_date"])
        df["qty"] = df["qty"].astype(float)

    cache.set(business_id, branch_id, "product_sales", df)
    return df


async def _get_product_sales_all(business_id: str) -> dict:
    """Aggregate product sales across all branches for the business."""
    branch_ids = await _get_branch_ids(business_id)

    per_branch: dict[str, pd.DataFrame] = {}
    all_dfs: list[pd.DataFrame] = []

    for bid in branch_ids:
        df = await get_product_sales(bid, business_id)
        per_branch[bid] = df
        if not df.empty:
            all_dfs.append(df)

    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)
        aggregated = (
            combined.groupby(
                ["product_id", "product_name", "sale_date"], as_index=False
            )["qty"]
            .sum()
            .sort_values("sale_date")
            .reset_index(drop=True)
        )
    else:
        aggregated = pd.DataFrame(
            columns=["product_id", "product_name", "sale_date", "qty"]
        )

    return {"aggregated": aggregated, "per_branch": per_branch}


# ---------------------------------------------------------------------------
# Task 2.3 — Customer transactions
# ---------------------------------------------------------------------------

async def get_customer_transactions(
    branch_id: str, business_id: str
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Extract customer transaction data for a branch.

    Returns a tuple of two DataFrames:
      - summary_df: columns customer_id, tx_count
      - detail_df:  columns customer_id, created_at  (individual rows for weekly breakdown)
    """
    cached = cache.get(business_id, branch_id, "customer_transactions")
    if cached is not None:
        return cached

    # Aggregated counts per customer
    summary_rows = await fetch(
        """
        SELECT customer_id, COUNT(*) AS tx_count
        FROM transactions
        WHERE branch_id=$1 AND business_id=$2 AND status='success'
        GROUP BY 1
        """,
        branch_id,
        business_id,
    )

    # Individual rows for weekly breakdown
    detail_rows = await fetch(
        """
        SELECT customer_id, created_at
        FROM transactions
        WHERE branch_id=$1 AND business_id=$2 AND status='success'
        ORDER BY created_at
        """,
        branch_id,
        business_id,
    )

    summary_df = _rows_to_df(summary_rows, ["customer_id", "tx_count"])
    if not summary_df.empty:
        summary_df["customer_id"] = summary_df["customer_id"].astype(str)
        summary_df["tx_count"] = summary_df["tx_count"].astype(int)

    detail_df = _rows_to_df(detail_rows, ["customer_id", "created_at"])
    if not detail_df.empty:
        detail_df["customer_id"] = detail_df["customer_id"].astype(str)
        detail_df["created_at"] = pd.to_datetime(detail_df["created_at"])

    result = (summary_df, detail_df)
    cache.set(business_id, branch_id, "customer_transactions", result)
    return result


# ---------------------------------------------------------------------------
# Task 2.4 — Products with stock levels
# ---------------------------------------------------------------------------

async def get_products_with_stock(branch_id: str, business_id: str) -> pd.DataFrame:
    """
    Extract product stock and reorder levels for a branch.

    Returns a DataFrame with columns:
        product_id, product_name, stock_quantity, reorder_level
    """
    cached = cache.get(business_id, branch_id, "products_stock")
    if cached is not None:
        return cached

    rows = await fetch(
        """
        SELECT id AS product_id,
               name AS product_name,
               stock_quantity,
               reorder_level
        FROM products
        WHERE branch_id=$1
        """,
        branch_id,
    )

    df = _rows_to_df(
        rows, ["product_id", "product_name", "stock_quantity", "reorder_level"]
    )
    if not df.empty:
        df["product_id"] = df["product_id"].astype(str)
        df["stock_quantity"] = df["stock_quantity"].astype(int)
        df["reorder_level"] = df["reorder_level"].astype(int)

    cache.set(business_id, branch_id, "products_stock", df)
    return df
