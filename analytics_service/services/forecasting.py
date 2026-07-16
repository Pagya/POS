"""
forecasting.py — Sales forecasting service.

Primary model: Facebook Prophet (handles seasonality and missing data well).
Fallback model: ARIMA(1,1,1) via statsmodels when Prophet fails.

Returns list[ForecastPoint] with non-negative predicted_revenue and
confidence intervals where lower <= predicted_revenue <= upper.
"""

import logging

import pandas as pd

from models.schemas import ConfidenceInterval, ForecastPoint

logger = logging.getLogger(__name__)


def forecast_sales(daily_df: pd.DataFrame, horizon_days: int) -> list[ForecastPoint]:
    """
    Forecast future sales revenue.

    Args:
        daily_df: DataFrame with columns 'ds' (datetime) and 'y' (float).
        horizon_days: Number of days to forecast into the future.

    Returns:
        list[ForecastPoint] for the next horizon_days, or empty list if both
        Prophet and ARIMA fail.
    """
    if daily_df.empty or horizon_days <= 0:
        return []

    # Try Prophet first
    try:
        return _forecast_with_prophet(daily_df, horizon_days)
    except Exception as exc:
        logger.warning("Prophet forecast failed, falling back to ARIMA: %s", exc)

    # Fallback to ARIMA
    try:
        return _forecast_with_arima(daily_df, horizon_days)
    except Exception as exc:
        logger.error("ARIMA forecast also failed: %s", exc)

    return []


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _clamp_and_build_point(
    date_str: str, predicted: float, lower: float, upper: float
) -> ForecastPoint:
    """
    Build a ForecastPoint ensuring:
    - predicted_revenue >= 0
    - lower <= predicted_revenue <= upper
    """
    predicted = max(0.0, predicted)
    lower = max(0.0, lower)
    upper = max(0.0, upper)

    # Enforce lower <= predicted <= upper
    lower = min(lower, predicted)
    upper = max(upper, predicted)

    return ForecastPoint(
        date=date_str,
        predicted_revenue=predicted,
        confidence_interval=ConfidenceInterval(lower=lower, upper=upper),
    )


def _forecast_with_prophet(
    daily_df: pd.DataFrame, horizon_days: int
) -> list[ForecastPoint]:
    """Fit Prophet and return forecast for the next horizon_days."""
    from prophet import Prophet  # lazy import — optional dependency

    df = daily_df[["ds", "y"]].copy()
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"] = df["y"].astype(float)

    m = Prophet()
    m.fit(df)

    future = m.make_future_dataframe(periods=horizon_days)
    forecast = m.predict(future)

    # Take only the last horizon_days rows (the future predictions)
    future_rows = forecast.tail(horizon_days)

    points: list[ForecastPoint] = []
    for _, row in future_rows.iterrows():
        date_str = pd.Timestamp(row["ds"]).date().isoformat()
        points.append(
            _clamp_and_build_point(
                date_str,
                float(row["yhat"]),
                float(row["yhat_lower"]),
                float(row["yhat_upper"]),
            )
        )

    return points


def _forecast_with_arima(
    daily_df: pd.DataFrame, horizon_days: int
) -> list[ForecastPoint]:
    """Fit ARIMA(1,1,1) and return forecast for the next horizon_days."""
    from statsmodels.tsa.arima.model import ARIMA  # lazy import — optional dependency

    series = daily_df["y"].astype(float)

    model = ARIMA(series, order=(1, 1, 1))
    result = model.fit()

    forecast_result = result.get_forecast(steps=horizon_days)
    predicted_mean = forecast_result.predicted_mean
    conf_int = forecast_result.conf_int()

    # Determine the starting date for forecast dates
    last_date = pd.to_datetime(daily_df["ds"].iloc[-1])

    points: list[ForecastPoint] = []
    for i in range(horizon_days):
        forecast_date = (last_date + pd.Timedelta(days=i + 1)).date().isoformat()
        predicted = float(predicted_mean.iloc[i])
        lower = float(conf_int.iloc[i, 0])
        upper = float(conf_int.iloc[i, 1])
        points.append(_clamp_and_build_point(forecast_date, predicted, lower, upper))

    return points
