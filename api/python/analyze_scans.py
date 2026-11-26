from fastapi import APIRouter, Body, HTTPException
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Optional
import base64
import re
import hashlib

router = APIRouter()

ANALYTICS_CACHE: dict[str, tuple[dict, float]] = {}
CACHE_TTL = 300  # 5 minutes

UA_BROWSER_PATTERNS = [
    (r"Chrome/\d+", "Chrome"),
    (r"Firefox/\d+", "Firefox"),
    (r"Safari/\d+", "Safari"),
    (r"Edge/\d+", "Edge"),
    (r"OPR/\d+|Opera/\d+", "Opera"),
    (r"MSIE \d+|Trident/\d+", "IE"),
]

COUNTRY_COORDS = {
    "Nigeria": (8.0, 10.0), "United States": (37.0, -95.0), "United Kingdom": (55.0, -3.0),
    "Germany": (51.0, 9.0), "France": (46.0, 2.0), "Canada": (56.0, -106.0),
    "Australia": (-25.0, 134.0), "India": (20.0, 78.0), "Brazil": (-14.0, -51.0),
    "South Africa": (-30.0, 25.0), "Kenya": (-1.0, 38.0), "Ghana": (8.0, -2.0),
    "Egypt": (27.0, 30.0), "UAE": (24.0, 54.0), "Saudi Arabia": (24.0, 45.0),
    "China": (35.0, 105.0), "Japan": (36.0, 138.0), "Singapore": (1.3, 103.8),
    "Netherlands": (52.0, 5.0), "Spain": (40.0, -4.0), "Italy": (42.0, 12.0),
    "Unknown": (0.0, 0.0),
}


def parse_browser(ua: str) -> str:
    for pattern, name in UA_BROWSER_PATTERNS:
        if re.search(pattern, ua):
            return name
    return "Unknown"


def clean_device_type(dt: str) -> str:
    dt_lower = dt.lower().strip()
    if dt_lower in ("phone", "mobile", "iphone", "android"):
        return "Mobile"
    if dt_lower in ("tablet", "ipad"):
        return "Tablet"
    if dt_lower in ("desktop", "pc", "mac"):
        return "Desktop"
    return dt.capitalize() if dt else "Unknown"


def extract_field(df: pd.DataFrame, candidates: list, default=None):
    for col in candidates:
        if col in df.columns:
            return col
    return default


def _aggregate(df: pd.DataFrame, tz: timezone) -> dict:
    """Core aggregation logic, reusable for current and previous periods."""
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        df = df.dropna(subset=["timestamp"])
        df["date"] = df["timestamp"].dt.tz_convert(tz).dt.date

        daily_counts = df.groupby("date").size().reset_index(name="scans")
        daily_counts["date"] = daily_counts["date"].astype(str)

        df["hour"] = df["timestamp"].dt.tz_convert(tz).dt.hour
        hourly_counts = df.groupby("hour").size().reset_index(name="scans")
        hourly_counts["hour"] = hourly_counts["hour"].astype(int)

        weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        df["day_of_week"] = df["timestamp"].dt.tz_convert(tz).dt.dayofweek
        df["weekday"] = df["day_of_week"].map(lambda d: weekday_names[d])
        weekday_counts = df.groupby("weekday").size().reindex(
            weekday_names, fill_value=0
        ).reset_index(name="scans")
    else:
        daily_counts = pd.DataFrame(columns=["date", "scans"])
        hourly_counts = pd.DataFrame(columns=["hour", "scans"])
        weekday_counts = pd.DataFrame(columns=["weekday", "scans"])

    # Device breakdown
    device_col = extract_field(df, ["device", "device.type", "deviceType", "device_type"])
    if device_col:
        df["device_clean"] = df[device_col].apply(
            lambda x: clean_device_type(str(x)) if pd.notna(x) else "Unknown"
        )
        devices = df["device_clean"].value_counts().to_dict()
    else:
        devices = {}

    # Location breakdown
    country_col = extract_field(df, ["country", "location.country", "locationCountry", "geo.country"])
    city_col = extract_field(df, ["city", "location.city", "locationCity", "geo.city"])

    top_countries = {}
    top_cities = {}
    if country_col:
        top_countries = df[country_col].value_counts().head(10).apply(int).to_dict()
    if city_col:
        cities_df = df.groupby([city_col, country_col] if country_col else [city_col]).size().reset_index(name="scans")
        cities_df = cities_df.sort_values("scans", ascending=False).head(10)
        top_cities = cities_df.to_dict(orient="records")

    # Browser breakdown
    browser_col = extract_field(df, ["browser", "device.browser", "userAgent", "user_agent"])
    browsers = {}
    if browser_col in ("userAgent", "user_agent"):
        browsers = df[browser_col].dropna().apply(
            lambda ua: parse_browser(str(ua))
        ).value_counts().to_dict()
    elif browser_col:
        browsers = df[browser_col].value_counts().apply(int).to_dict()

    # OS breakdown
    os_col = extract_field(df, ["os", "device.os", "operating_system", "platform"])
    operating_systems = {}
    if os_col:
        operating_systems = df[os_col].value_counts().head(10).apply(int).to_dict()

    # Referrer breakdown
    referrer_col = extract_field(df, ["referrer", "referer", "socialSource", "social_source"])
    referrers = {}
    if referrer_col:
        referrers = df[referrer_col].value_counts().head(10).apply(int).to_dict()

    # Unique visitors (by IP if available)
    ip_col = extract_field(df, ["ip", "client_ip", "remote_addr"])
    unique_visitors = None
    if ip_col:
        unique_visitors = int(df[ip_col].nunique())

    return {
        "total_scans": int(len(df)),
        "daily_trend": daily_counts.to_dict(orient="records"),
        "hourly_distribution": hourly_counts.to_dict(orient="records"),
        "weekday_distribution": weekday_counts.to_dict(orient="records"),
        "devices": {str(k): int(v) for k, v in devices.items()},
        "top_countries": {str(k): int(v) for k, v in top_countries.items()},
        "top_cities": top_cities,
        "browsers": {str(k): int(v) for k, v in browsers.items()},
        "operating_systems": {str(k): int(v) for k, v in operating_systems.items()},
        "referrers": {str(k): int(v) for k, v in referrers.items()},
        "unique_visitors": unique_visitors,
    }


@router.post("/aggregate")
async def aggregate_scans(
    scans: list = Body(...),
    timezone_offset: int = Body(0),
    compare_previous: bool = Body(False),
    cache_key: Optional[str] = Body(None),
):
    if not scans:
        return {"error": "No scan data provided"}

    # Cache lookup
    if cache_key:
        cache_key_hash = hashlib.sha256(cache_key.encode()).hexdigest()
        cached = ANALYTICS_CACHE.get(cache_key_hash)
        if cached and (datetime.now(timezone.utc).timestamp() - cached[1]) < CACHE_TTL:
            return cached[0]

    tz = timezone(timedelta(hours=timezone_offset))
    df = pd.DataFrame(scans)

    result = _aggregate(df, tz)

    if compare_previous and "timestamp" in df.columns:
        today = datetime.now(tz).date()
        period_days = 7
        if len(result["daily_trend"]) > 0:
            dates = [d["date"] for d in result["daily_trend"] if d.get("date")]
            if dates:
                period_days = max(len(dates), 3)

        cutoff_current = today - timedelta(days=period_days)
        cutoff_previous = today - timedelta(days=period_days * 2)

        df_current = df[df["date"] >= cutoff_current] if "date" in df.columns else pd.DataFrame()
        df_previous = df[(df["date"] >= cutoff_previous) & (df["date"] < cutoff_current)] if "date" in df.columns else pd.DataFrame()

        result["current_period"] = _aggregate(df_current, tz)
        result["previous_period"] = _aggregate(df_previous, tz) if len(df_previous) > 0 else None

        # Growth rates
        cur_total = result["current_period"]["total_scans"]
        prev_total = result["previous_period"]["total_scans"] if result["previous_period"] else 0
        growth = None
        if prev_total and prev_total > 0:
            growth = round(((cur_total - prev_total) / prev_total) * 100, 1)
        result["growth_rate"] = growth
        result["comparison_period_days"] = period_days

    result["aggregated_at"] = datetime.now(timezone.utc).isoformat()

    # Cache result
    if cache_key:
        ANALYTICS_CACHE[cache_key_hash] = (result, datetime.now(timezone.utc).timestamp())

    return result


@router.post("/geo-data")
async def geo_data(
    scans: list = Body(...),
):
    """Return scan location data as GeoJSON FeatureCollection for map rendering."""
    if not scans:
        return {"type": "FeatureCollection", "features": []}

    df = pd.DataFrame(scans)
    country_col = extract_field(df, ["country", "location.country", "locationCountry", "geo.country"])
    city_col = extract_field(df, ["city", "location.city", "locationCity", "geo.city"])

    if not country_col:
        return {"type": "FeatureCollection", "features": []}

    country_counts = df[country_col].value_counts().to_dict()
    features = []

    for country, count in country_counts.items():
        coords = COUNTRY_COORDS.get(str(country), (0.0, 0.0))
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [coords[1], coords[0]]},
            "properties": {
                "country": str(country),
                "scans": int(count),
                "radius": min(10 + int(count) * 0.5, 50),
            },
        })

    # Add city-level points if available
    if city_col:
        city_groups = df.groupby([city_col, country_col] if country_col else [city_col]).size().reset_index(name="scans")
        for _, row in city_groups.iterrows():
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [0.0, 0.0]},
                "properties": {
                    "city": str(row[city_col]),
                    "country": str(row[country_col]) if country_col else "",
                    "scans": int(row["scans"]),
                    "radius": min(5 + int(row["scans"]) * 0.3, 30),
                    "is_city": True,
                },
            })

    return {"type": "FeatureCollection", "features": features}


@router.post("/export")
async def export_data(
    scans: list = Body(...),
    format: str = Body("csv"),
    columns: Optional[list] = Body(None),
):
    if not scans:
        raise HTTPException(status_code=400, detail="No scan data provided")

    df = pd.DataFrame(scans)

    if columns:
        df = df[[c for c in columns if c in df.columns]]

    if format == "csv":
        csv_data = df.to_csv(index=False)
        return {
            "data": base64.b64encode(csv_data.encode()).decode(),
            "format": "csv",
            "filename": f"scan_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        }
    elif format == "json":
        json_data = df.to_json(orient="records", date_format="iso")
        return {
            "data": base64.b64encode(json_data.encode()).decode(),
            "format": "json",
            "filename": f"scan_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        }
    elif format == "xlsx":
        try:
            buf = BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Scans")
            xlsx_data = base64.b64encode(buf.getvalue()).decode()
            return {
                "data": xlsx_data,
                "format": "xlsx",
                "filename": f"scan_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            }
        except ImportError:
            from io import BytesIO as _BytesIO
            buf = _BytesIO()
            df.to_csv(buf, index=False)
            return {
                "data": base64.b64encode(buf.getvalue()).decode(),
                "format": "csv",
                "filename": f"scan_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                "note": "openpyxl not available, fell back to CSV",
            }
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")
