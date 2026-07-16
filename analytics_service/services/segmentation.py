"""
segmentation.py — Customer behaviour segmentation service.

Classifies customers as:
  - 'new'    : tx_count == 1 (only one transaction in the business)
  - 'repeat' : tx_count > 1  (more than one transaction in the business)

Returns a SegmentationSummary (without insight / generated_at — those are
added by the router after calling the OpenAI client).
"""

import logging

import pandas as pd

from models.schemas import CustomerSegment, DateRange, SegmentationSummary, WeeklySegment

logger = logging.getLogger(__name__)


def segment_customers(
    tx_df: tuple[pd.DataFrame, pd.DataFrame],
    date_range: DateRange | None,
) -> SegmentationSummary:
    """
    Classify customers and build a segmentation summary.

    Args:
        tx_df: Tuple of (summary_df, detail_df) as returned by
               data_pipeline.get_customer_transactions().
               - summary_df: columns customer_id, tx_count
               - detail_df:  columns customer_id, created_at
        date_range: Optional DateRange to filter the weekly breakdown.
                    Does NOT affect the overall classification (which is
                    based on the full business-level tx_count).

    Returns:
        SegmentationSummary without insight and generated_at fields
        (those are populated by the router).
    """
    summary_df, detail_df = tx_df

    # ------------------------------------------------------------------
    # 1. Overall classification
    # ------------------------------------------------------------------
    total_customers = len(summary_df)

    if total_customers == 0:
        return SegmentationSummary(
            total_customers=0,
            new_customers=CustomerSegment(count=0, percentage=0.0),
            repeat_customers=CustomerSegment(count=0, percentage=0.0),
            repeat_purchase_rate=0.0,
            weekly_breakdown=[],
            insight="",
            generated_at="",
        )

    new_mask = summary_df["tx_count"] == 1
    new_count = int(new_mask.sum())
    repeat_count = total_customers - new_count

    new_pct = round(new_count / total_customers * 100, 2)
    repeat_pct = round(repeat_count / total_customers * 100, 2)
    repeat_rate = round(repeat_count / total_customers, 4)

    # ------------------------------------------------------------------
    # 2. Build a customer → segment lookup for the weekly breakdown
    # ------------------------------------------------------------------
    customer_segment: dict[str, str] = {}
    for _, row in summary_df.iterrows():
        cid = str(row["customer_id"])
        customer_segment[cid] = "new" if int(row["tx_count"]) == 1 else "repeat"

    # ------------------------------------------------------------------
    # 3. Weekly breakdown
    # ------------------------------------------------------------------
    weekly_breakdown = _build_weekly_breakdown(detail_df, customer_segment, date_range)

    return SegmentationSummary(
        total_customers=total_customers,
        new_customers=CustomerSegment(count=new_count, percentage=new_pct),
        repeat_customers=CustomerSegment(count=repeat_count, percentage=repeat_pct),
        repeat_purchase_rate=repeat_rate,
        weekly_breakdown=weekly_breakdown,
        # insight and generated_at are set by the router
        insight="",
        generated_at="",
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_weekly_breakdown(
    detail_df: pd.DataFrame,
    customer_segment: dict[str, str],
    date_range: DateRange | None,
) -> list[WeeklySegment]:
    """
    Group detail_df by ISO week (Monday as week start) and count unique
    customers per week classified as new vs repeat.
    """
    if detail_df.empty:
        return []

    df = detail_df.copy()
    df["created_at"] = pd.to_datetime(df["created_at"])

    # Apply optional date range filter
    if date_range is not None:
        start = pd.to_datetime(date_range.start_date)
        end = pd.to_datetime(date_range.end_date)
        df = df[(df["created_at"] >= start) & (df["created_at"] <= end)]

    if df.empty:
        return []

    # Compute week_start (Monday) for each row
    df["week_start"] = df["created_at"].dt.to_period("W-SUN").apply(
        lambda p: p.start_time
    )

    # Attach segment label
    df["segment"] = df["customer_id"].map(customer_segment).fillna("new")

    # Count unique customers per week per segment
    weekly_counts = (
        df.groupby(["week_start", "segment"])["customer_id"]
        .nunique()
        .unstack(fill_value=0)
        .reset_index()
    )

    # Ensure both columns exist
    for col in ("new", "repeat"):
        if col not in weekly_counts.columns:
            weekly_counts[col] = 0

    weekly_counts = weekly_counts.sort_values("week_start")

    segments: list[WeeklySegment] = []
    for _, row in weekly_counts.iterrows():
        week_start_str = pd.Timestamp(row["week_start"]).date().isoformat()
        segments.append(
            WeeklySegment(
                week_start=week_start_str,
                new_count=int(row["new"]),
                repeat_count=int(row["repeat"]),
            )
        )

    return segments
