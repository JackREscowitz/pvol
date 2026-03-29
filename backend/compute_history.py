"""
Precompute historical PVOL vs DVOL for all contract months and write to data/history.json.

Usage:
    cd backend
    python compute_history.py

Takes a few minutes (one CoinGecko + one Deribit + N CLOB calls per month).
Re-run any time you want to refresh the data.
"""

import json
import pathlib
import requests
from datetime import datetime, timezone, timedelta

from pvol_engine import (
    fetch_spot_range,
    fetch_price_history,
    fetch_dvol_series,
    get_dvol_at,
    parse_markets,
    get_p_at_date,
    compute_pvol_snapshot,
)

GAMMA = "https://gamma-api.polymarket.com"

CONTRACTS = [
    ("july-2025",      "what-price-will-bitcoin-hit-in-july"),
    ("august-2025",    "what-price-will-bitcoin-hit-in-august"),
    ("september-2025", "what-price-will-bitcoin-hit-in-september"),
    ("october-2025",   "what-price-will-bitcoin-hit-in-october-985"),
    ("november-2025",  "what-price-will-bitcoin-hit-in-november-2025"),
    # No dedicated December 2025 monthly event; use the annual 2025 event (expires Jan 1 2026)
    ("december-2025",  "what-price-will-bitcoin-hit-in-2025"),
    ("january-2026",   "what-price-will-bitcoin-hit-in-january-2026"),
    ("february-2026",  "what-price-will-bitcoin-hit-in-february-2026"),
]


def compute_contract(key: str, slug: str) -> list[dict]:
    print(f"\n=== {key} ===")

    # 1. Event metadata
    event  = requests.get(f"{GAMMA}/events/slug/{slug}").json()
    expiry = datetime.fromisoformat(event["endDate"].replace("Z", "+00:00"))
    up_m, dn_m = parse_markets(event)

    # 2. Date range: day 1 of contract month to expiry - 7 days (near-expiry noise)
    start  = (expiry - timedelta(days=15)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cutoff = expiry - timedelta(days=7)
    dates  = []
    d = start
    while d <= cutoff:
        dates.append(d)
        d += timedelta(days=1)
    print(f"  {dates[0].date()} to {dates[-1].date()}  ({len(dates)} days)")

    # 3. BTC spot for all dates (single range call; day-1 also extracted from this)
    spot_cache = fetch_spot_range(dates[0], dates[-1] + timedelta(days=1))
    spot_day1  = spot_cache.get(dates[0])
    if spot_day1 is None:
        print("  WARNING: no day-1 spot — skipping month")
        return []
    n_ok = sum(1 for dt in dates if spot_cache.get(dt) is not None)
    print(f"  spot day-1: ${spot_day1:,.0f}  |  {n_ok}/{len(dates)} dates resolved")

    up_m = {h: tok for h, tok in up_m.items() if h > spot_day1}
    dn_m = {h: tok for h, tok in dn_m.items() if h < spot_day1}
    print(f"  {len(up_m)} up + {len(dn_m)} dn markets after cross-side filter")

    # 4. Polymarket price histories (one call per token)
    all_tokens = {**up_m, **dn_m}
    print(f"  fetching {len(all_tokens)} token histories...", end="", flush=True)
    price_data = {tok: fetch_price_history(tok) for tok in all_tokens.values()}
    print(f"  {sum(len(v) for v in price_data.values())} pts")

    # 5. Deribit DVOL series (one call for full month)
    dvol_series = fetch_dvol_series(dates[0], expiry)
    print(f"  dvol: {len(dvol_series)} hourly readings  "
          f"({min(v for _, v in dvol_series):.1%} – {max(v for _, v in dvol_series):.1%})")

    # 6. Compute PVOL per day
    records: list[dict] = []
    for dt in dates:
        spot = spot_cache.get(dt)
        if spot is None:
            continue
        T = (expiry - dt).total_seconds() / (365.25 * 86400)

        up_raw = {
            h: p for h in up_m
            if h > spot and (p := get_p_at_date(up_m[h], price_data, dt)) is not None
        }
        dn_raw = {
            h: p for h in dn_m
            if h < spot and (p := get_p_at_date(dn_m[h], price_data, dt)) is not None
        }

        if len(up_raw) < 2 or len(dn_raw) < 2:
            continue

        pv  = compute_pvol_snapshot(
            dict(sorted(up_raw.items())),
            dict(sorted(dn_raw.items(), reverse=True)),
            spot, T,
        )
        dv = get_dvol_at(dvol_series, dt)
        if dv is None:
            continue

        pvol = pv["pvol_combined"]
        records.append({
            "date":           dt.date().isoformat(),
            "contract_month": key,
            "pvol":           round(pvol, 4) if pvol is not None else None,
            "pvol_up":        round(pv["pvol_up"],   4) if pv["pvol_up"]   is not None else None,
            "pvol_down":      round(pv["pvol_down"], 4) if pv["pvol_down"] is not None else None,
            "dvol":           round(dv, 4),
            "gap":            round(pvol - dv, 4) if pvol is not None else None,
            "spot":           round(spot),
            "n_rungs":        pv["n_rungs"],
        })

    print(f"  computed: {len(records)} records")
    return records


def main():
    all_records: list[dict] = []
    for key, slug in CONTRACTS:
        all_records.extend(compute_contract(key, slug))

    out_dir  = pathlib.Path(__file__).parent / "data"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / "history.json"
    out_file.write_text(json.dumps(all_records, indent=2))
    print(f"\nDone. Wrote {len(all_records)} records to {out_file}")


if __name__ == "__main__":
    main()
