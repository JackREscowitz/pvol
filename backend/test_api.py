"""
API test script for the PVOL backend.
Run with the server already started:

    uvicorn main:app --reload &
    python test_api.py
"""

import sys
import requests
from collections import defaultdict

BASE = "http://localhost:8000/api"
PASS = "\033[32m PASS\033[0m"
FAIL = "\033[31m FAIL\033[0m"

failures = 0


def check(label: str, condition: bool, detail: str = ""):
    global failures
    status = PASS if condition else FAIL
    suffix = f"  ({detail})" if detail else ""
    print(f"  {status}  {label}{suffix}")
    if not condition:
        failures += 1


def section(title: str):
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


# ---------------------------------------------------------------------------
# /api/health
# ---------------------------------------------------------------------------
section("GET /api/health")
try:
    r = requests.get(f"{BASE}/health", timeout=5)
    check("status 200", r.status_code == 200, str(r.status_code))
    data = r.json()
    check("status=ok", data.get("status") == "ok", str(data.get("status")))
    check("history_ready=true", data.get("history_ready") is True,
          str(data.get("history_ready")))
except requests.ConnectionError:
    print(f"  {FAIL}  Could not connect to {BASE} — is the server running?")
    sys.exit(1)


# ---------------------------------------------------------------------------
# /api/history — HTTP basics
# ---------------------------------------------------------------------------
section("GET /api/history — HTTP")
r = requests.get(f"{BASE}/history", timeout=15)
check("status 200", r.status_code == 200, str(r.status_code))
check("Content-Type JSON", "application/json" in r.headers.get("content-type", ""))

records = r.json()
check("response is a list", isinstance(records, list), type(records).__name__)
check("non-empty", len(records) > 0, f"{len(records)} records")

# ---------------------------------------------------------------------------
# /api/history — schema
# ---------------------------------------------------------------------------
section("GET /api/history — record schema")
REQUIRED_FIELDS = {"date", "contract_month", "pvol", "dvol", "gap", "spot", "n_rungs"}
OPTIONAL_FIELDS = {"pvol_up", "pvol_down"}

bad_schema = [r for r in records if not REQUIRED_FIELDS.issubset(r.keys())]
check("all records have required fields", len(bad_schema) == 0,
      f"{len(bad_schema)} malformed" if bad_schema else "")

# Spot-check first and last record
for rec in [records[0], records[-1]]:
    check(f"date is ISO string ({rec.get('date')})",
          isinstance(rec.get("date"), str) and len(rec["date"]) == 10)
    check(f"contract_month non-empty ({rec.get('contract_month')})",
          bool(rec.get("contract_month")))

# ---------------------------------------------------------------------------
# /api/history — data quality
# ---------------------------------------------------------------------------
section("GET /api/history — data quality")

EXPECTED_MONTHS = {
    "july-2025", "august-2025", "september-2025", "october-2025",
    "november-2025", "december-2025", "january-2026", "february-2026",
}
present_months = {r["contract_month"] for r in records}
check("all 8 contract months present",
      EXPECTED_MONTHS == present_months,
      f"missing: {EXPECTED_MONTHS - present_months}" if EXPECTED_MONTHS != present_months else "")

by_month = defaultdict(list)
for rec in records:
    by_month[rec["contract_month"]].append(rec)

for month in sorted(EXPECTED_MONTHS):
    recs = by_month[month]
    check(f"{month}: ≥ 20 records", len(recs) >= 20, f"{len(recs)} records")

null_pvol = [r for r in records if r.get("pvol") is None]
check("no null pvol values", len(null_pvol) == 0,
      f"{len(null_pvol)} nulls" if null_pvol else "")

pvols = [r["pvol"] for r in records if r["pvol"] is not None]
dvols = [r["dvol"] for r in records if r["dvol"] is not None]
check("PVOL values in plausible range (0.2–2.0)",
      all(0.2 <= v <= 2.0 for v in pvols),
      f"out-of-range: {[v for v in pvols if not 0.2 <= v <= 2.0][:3]}")
check("DVOL values in plausible range (0.2–2.0)",
      all(0.2 <= v <= 2.0 for v in dvols),
      f"out-of-range: {[v for v in dvols if not 0.2 <= v <= 2.0][:3]}")

gaps = [r["gap"] for r in records if r["gap"] is not None]
check("gap = pvol - dvol (spot-check 10 records)",
      all(abs(r["pvol"] - r["dvol"] - r["gap"]) < 0.0001
          for r in records[:10] if r["pvol"] and r["dvol"] and r["gap"] is not None))

spots = [r["spot"] for r in records]
check("spot prices in plausible BTC range ($20k–$200k)",
      all(20_000 <= s <= 200_000 for s in spots),
      f"out-of-range: {[s for s in spots if not 20_000 <= s <= 200_000][:3]}")

n_rungs = [r["n_rungs"] for r in records]
check("n_rungs ≥ 4 on all records", all(n >= 4 for n in n_rungs),
      f"low-rung records: {sum(1 for n in n_rungs if n < 4)}")

# Chronological order within each month
order_ok = True
for month, recs in by_month.items():
    dates = [r["date"] for r in recs]
    if dates != sorted(dates):
        order_ok = False
        break
check("records are in date order within each month", order_ok)

# ---------------------------------------------------------------------------
# /api/history — CORS header
# ---------------------------------------------------------------------------
section("CORS")
r2 = requests.get(f"{BASE}/history", headers={"Origin": "http://localhost:5173"}, timeout=5)
check("Access-Control-Allow-Origin present",
      "access-control-allow-origin" in {k.lower() for k in r2.headers})

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
section("Summary")
total = sum(1 for line in open(__file__) if "check(" in line)
print(f"  Records: {len(records)} across {len(present_months)} months")
pvol_mean = sum(pvols) / len(pvols) if pvols else 0
dvol_mean = sum(dvols) / len(dvols) if dvols else 0
print(f"  PVOL mean: {pvol_mean:.1%}   DVOL mean: {dvol_mean:.1%}   "
      f"Gap mean: {pvol_mean - dvol_mean:+.1%}")

if failures == 0:
    print(f"\n  \033[32mAll checks passed.\033[0m")
else:
    print(f"\n  \033[31m{failures} check(s) failed.\033[0m")
    sys.exit(1)
