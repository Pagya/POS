"""
demand.py — Per-product demand forecasting service.

For each product:
  - >= 14 days of history: use Prophet to forecast
  - < 14 days of history: use moving average (mean of available qty values)
    and attach a data_quality_warning

Returns list[DemandForecast] sorted by predicted_quantity DESC.
"""

import logging

import pandas as pd

from models.schemas import ConfidenceInterval, DemandForecast

logger = logging.getLogger(__name__)

_SHORT_HISTORY_WARNING = "Insufficient historical data (< 14 days); using moving average estimate"
_MIN_DAYS_FOR_PROPHET = 14


def forecast_demand(
    product_df: pd.DataFrame, horizon_days: int
) -> list[DemandForecast]:
    """
    Forecast demand per product.

    Args:
        product_df: DataFrame with columns 'product_id', 'product_name',
                    'sale_date' (datetime), 'qty' (float).
        horizon_days: Number of days to forecast into the future.

    Returns:
        list[DemandForecast] sorted by predicted_quantity DESC.
    """
    if product_df.empty or horizon_days <= 0:
        return []

    results: list[DemandForecast] = []

    for (product_id, product_name), group in product_df.groupby(
        ["product_id", "product_name"], sort=False
    ):
        # Count unique sale dates to determine history length
        unique_days = group["sale_date"].nunique()

        if unique_days >= _MIN_DAYS_FOR_PROPHET:
            forecast = _prophet_forecast(
                str(product_id), str(product_name), group, horizon_days
            )
        else:
            forecast = _moving_average_forecast(
                str(product_id), str(product_name), group, horizon_days
            )

        results.append(forecast)

    # Sort by predicted_quantity descending
    results.sort(key=lambda x: x.predicted_quantity, reverse=True)
    return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _clamp(value: float) -> float:
    return max(0.0, value)


def _prophet_forecast(
    product_id: str,
    product_name: str,
    group: pd.DataFrame,
    horizon_days: int,
) -> DemandForecast:
    """Use Prophet to forecast total demand over horizon_days."""
    try:
        from prophet import Prophet  # lazy import

        # Aggregate daily qty for this product
        daily = (
            group.groupby("sale_date", as_index=False)["qty"]
            .sum()
            .rename(columns={"sale_date": "ds", "qty": "y"})
        )
        daily["ds"] = pd.to_datetime(daily["ds"])
        daily["y"] = daily["y"].astype(float)

        m = Prophet()
        m.fit(daily)

        future = m.make_future_dataframe(periods=horizon_days)
        forecast = m.predict(future)

        future_rows = forecast.tail(horizon_days)
        predicted = _clamp(float(future_rows["yhat"].sum()))
        lower = _clamp(float(future_rows["yhat_lower"].sum()))
        upper = _clamp(float(future_rows["yhat_upper"].sum()))

        # Enforce lower <= predicted <= upper
        lower = min(lower, predicted)
        upper = max(upper, predicted)

        return DemandForecast(
            product_id=product_id,
            product_name=product_name,
            predicted_quantity=predicted,
            confidence_interval=ConfidenceInterval(lower=lower, upper=upper),
            data_quality_warning=None,
        )
    except Exception as exc:
        logger.warning(
            "Prophet demand forecast failed for product %s, falling back to moving average: %s",
            product_id,
            exc,
        )
        return _moving_average_forecast(product_id, product_name, group, horizon_days)


def _moving_average_forecast(
    product_id: str,
    product_name: str,
    group: pd.DataFrame,
    horizon_days: int,
) -> DemandForecast:
    """
    Estimate demand using moving average when history is too short for Prophet.

    predicted_quantity = mean(qty) * horizon_days / len(available_days)
    confidence_interval = { lower: predicted * 0.8, upper: predicted * 1.2 }
    """
    available_days = group["sale_date"].nunique()
    mean_qty = float(group["qty"].mean()) if not group.empty else 0.0

    if available_days > 0:
        predicted = _clamp(mean_qty * horizon_days / available_days)
    else:
        predicted = 0.0

    lower = _clamp(predicted * 0.8)
    upper = predicted * 1.2  # upper can be > predicted, no need to clamp

    return DemandForecast(
        product_id=product_id,
        product_name=product_name,
        predicted_quantity=predicted,
        confidence_interval=ConfidenceInterval(lower=lower, upper=upper),
        data_quality_warning=_SHORT_HISTORY_WARNING,
    )
