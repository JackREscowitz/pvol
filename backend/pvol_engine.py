"""
PVOL computation engine — ported from pvol_dvol_timeseries.ipynb.
No FastAPI dependency; importable by compute_history.py and future live endpoints.
"""

import re
import json
import time
import requests
import numpy as np
from datetime import datetime, timezone, timedelta
from scipy.stats import norm
from scipy.optimize import curve_fit

GAMMA   = "https://gamma-api.polymarket.com"
CLOB    = "https://clob.polymarket.com"
EPSILON = 0.0001

# ---------------------------------------------------------------------------
# Data fetch helpers
# ---------------------------------------------------------------------------

def fetch_spot_range(start: datetime, end: datetime) -> dict:
    """
    Fetch BTC daily spot prices for a date range via CoinGecko market_chart/range.
    One API call; no per-date rate limiting.
    Returns {midnight_utc_datetime: float}.
    For ranges <90d CoinGecko returns hourly data; resampled to daily here.
    """
    for attempt in range(4):
        r = requests.get(
            "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range",
            params={"vs_currency": "usd",
                    "from": int(start.timestamp()),
                    "to":   int(end.timestamp()),
                    "precision": "2"},
            headers={"accept": "application/json"},
        )
        if r.status_code == 429:
            wait = 65 * (attempt + 1)
            print(f"  CoinGecko 429 — waiting {wait}s before retry {attempt + 1}/3...", flush=True)
            time.sleep(wait)
            continue
        r.raise_for_status()
        break
    else:
        r.raise_for_status()  # final raise if all retries exhausted
    prices = r.json()["prices"]  # [[ts_ms, price], ...]

    # Resample to daily: keep entry closest to midnight UTC per calendar day
    daily: dict = {}
    for ts_ms, price in prices:
        dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        midnight = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        if midnight not in daily or \
                abs((dt - midnight).total_seconds()) < abs((daily[midnight][0] - midnight).total_seconds()):
            daily[midnight] = (dt, price)
    return {d: p for d, (_, p) in daily.items()}


def fetch_price_history(token_id: str) -> list:
    """
    Fetch full CLOB price history for a token.
    interval=all + fidelity=1440 works for both active and expired markets.
    Returns [] on 400 (no trading history for token).
    """
    r = requests.get(f"{CLOB}/prices-history", params=dict(
        market=token_id,
        interval="all",
        fidelity=1440,
    ))
    if r.status_code == 400:
        return []
    r.raise_for_status()
    return r.json().get("history", [])


def fetch_dvol_series(start: datetime, end: datetime) -> list:
    """
    Fetch hourly Deribit DVOL for BTC over [start, end].
    Returns list of (datetime_utc, dvol_decimal) tuples.
    Values from Deribit are in percent; divided by 100 here.
    Uses row[4] (close) of each OHLC candle.
    """
    r = requests.get(
        "https://www.deribit.com/api/v2/public/get_volatility_index_data",
        params=dict(
            currency="BTC",
            start_timestamp=int(start.timestamp() * 1000),
            end_timestamp=int(end.timestamp()   * 1000),
            resolution=3600,
        ),
    )
    r.raise_for_status()
    data = r.json()["result"]["data"]
    return [
        (datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc), row[4] / 100.0)
        for row in data
    ]


def get_dvol_at(dvol_series: list, target_dt: datetime) -> float | None:
    """Return DVOL value closest in time to target_dt."""
    if not dvol_series:
        return None
    _, val = min(dvol_series, key=lambda x: abs((x[0] - target_dt).total_seconds()))
    return val


# ---------------------------------------------------------------------------
# Polymarket market parsing
# ---------------------------------------------------------------------------

def parse_strike(question: str) -> int | None:
    m = re.search(r"\$([0-9][0-9,]*)([kK])?", question)
    if not m:
        return None
    digits = int(m.group(1).replace(",", ""))
    if m.group(2):
        digits *= 1000
    return digits


def has_date_qualifier(question: str) -> bool:
    return bool(re.search(r"after|before|starting|from\s+", question, re.IGNORECASE))


def parse_markets(event: dict) -> tuple[dict, dict]:
    """
    Returns (upside, downside): {strike: token_id}.
    Filters out cross-contract questions with date qualifiers.
    """
    up: dict = {}
    dn: dict = {}
    for m in event["markets"]:
        q = m["question"]
        if has_date_qualifier(q):
            continue
        strike = parse_strike(q)
        if strike is None:
            continue
        if "clobTokenIds" not in m:
            continue
        token_id = json.loads(m["clobTokenIds"])[0]
        q_lower = q.lower()
        if "reach" in q_lower:
            up[strike] = token_id
        elif "dip" in q_lower:
            dn[strike] = token_id
    return up, dn


# ---------------------------------------------------------------------------
# Price lookup
# ---------------------------------------------------------------------------

def get_p_at_date(token_id: str, price_data: dict, target_dt: datetime,
                  window_hours: int = 4) -> float | None:
    """
    Return the YES token price closest to midnight UTC on target_dt,
    within window_hours. Returns None if no entry found in window.
    """
    hist = price_data.get(token_id, [])
    if not hist:
        return None
    target_unix = int(target_dt.timestamp())
    window = window_hours * 3600
    best_p, best_d = None, float("inf")
    for row in hist:
        delta = abs(row["t"] - target_unix)
        if delta <= window and delta < best_d:
            best_p, best_d = row["p"], delta
    return best_p


# ---------------------------------------------------------------------------
# PVOL pipeline
# ---------------------------------------------------------------------------

def get_p_hat(yes_price: float, yes_bid: float | None = None,
              yes_ask: float | None = None) -> float:
    raw = (yes_bid + yes_ask) / 2.0 if (yes_bid is not None and yes_ask is not None) else yes_price
    return float(np.clip(raw, EPSILON, 1.0 - EPSILON))


def fit_logistic(probs: dict, spot: float) -> dict:
    """
    Fit P(d) = 1/(1+exp(a+b*d)) in log-distance space.
    Falls back to raw probs if fit fails or fewer than 3 rungs.
    """
    if len(probs) < 3:
        return probs
    strikes = np.array(list(probs.keys()), dtype=float)
    p_vals  = np.array(list(probs.values()), dtype=float)
    d_vals  = np.abs(np.log(strikes / spot))

    def logistic(d, a, b):
        return 1.0 / (1.0 + np.exp(a + b * d))

    try:
        popt, _ = curve_fit(logistic, d_vals, p_vals, p0=[-0.5, 6.0],
                            bounds=([-5., 0.], [5., 12.]), maxfev=10_000)
        a, b = popt
        return {
            h: float(np.clip(logistic(abs(np.log(h / spot)), a, b), EPSILON, 1.0 - EPSILON))
            for h in probs
        }
    except Exception:
        return probs


def clean_ladder(probs: dict) -> dict:
    """Drop rungs at and beyond the first monotonicity violation."""
    clean: dict = {}
    prev_p = 1.0
    for h, p in probs.items():
        if p >= prev_p:
            break
        clean[h] = p
        prev_p = p
    return clean


def compute_pvol_snapshot(upside_raw: dict, downside_raw: dict,
                          spot: float, T: float) -> dict:
    """
    Full pipeline for one snapshot.
    Returns {pvol_up, pvol_down, pvol_combined, n_rungs}. All vols annualized decimals.
    """
    null = {"pvol_up": None, "pvol_down": None, "pvol_combined": None, "n_rungs": 0}
    if T <= 0 or len(upside_raw) < 2 or len(downside_raw) < 2:
        return null

    up_p  = {h: get_p_hat(p) for h, p in upside_raw.items()}
    dn_p  = {h: get_p_hat(p) for h, p in downside_raw.items()}
    up_s  = fit_logistic(up_p,  spot)
    dn_s  = fit_logistic(dn_p,  spot)
    up_c  = clean_ladder(dict(sorted(up_s.items())))
    dn_c  = clean_ladder(dict(sorted(dn_s.items(), reverse=True)))

    def _side_pvol(probs_clean: dict) -> float | None:
        rows = []
        for h, p in probs_clean.items():
            sigma = abs(np.log(h / spot)) / (np.sqrt(T) * abs(norm.ppf(p / 2.0)))
            rows.append((p, sigma))
        if len(rows) < 2:
            return None
        ps = np.array([r[0] for r in rows])
        ss = np.array([r[1] for r in rows])
        w  = np.empty(len(ps))
        for i in range(len(ps) - 1):
            w[i] = ps[i] - ps[i + 1]
        w[-1] = ps[-1]
        return float((w * ss).sum() / w.sum())

    pvol_up   = _side_pvol(up_c)
    pvol_down = _side_pvol(dn_c)

    # Combined: all rungs sorted by log-distance, reweighted
    all_rungs = []
    for h, p in {**up_c, **dn_c}.items():
        d     = abs(np.log(h / spot))
        sigma = d / (np.sqrt(T) * abs(norm.ppf(p / 2.0)))
        all_rungs.append((d, p, sigma))
    all_rungs.sort()

    pvol_combined = None
    if len(all_rungs) >= 2:
        ps = np.array([r[1] for r in all_rungs])
        ss = np.array([r[2] for r in all_rungs])
        w  = np.empty(len(ps))
        for i in range(len(ps) - 1):
            w[i] = ps[i] - ps[i + 1]
        w[-1] = ps[-1]
        pvol_combined = float((w * ss).sum() / w.sum())

    return {
        "pvol_up":       pvol_up,
        "pvol_down":     pvol_down,
        "pvol_combined": pvol_combined,
        "n_rungs":       len(all_rungs),
    }
