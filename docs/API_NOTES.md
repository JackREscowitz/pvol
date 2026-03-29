# API Notes — PVOL Data Sources
*Discovered behavior and gotchas for all four data APIs. Reference before writing any fetch code.*

---

## 1. Polymarket Gamma API
**Base:** `https://gamma-api.polymarket.com`

### Event discovery
Monthly BTC events follow a predictable slug:
```
what-price-will-bitcoin-hit-in-{month}-{year}
```
Examples: `what-price-will-bitcoin-hit-in-november-2025`, `what-price-will-bitcoin-hit-in-february-2026`

Fetch with:
```
GET /events/slug/{slug}
```

### `endDate` is NOT the last day of the contract month
`event["endDate"]` returns the **first day of the following month** (e.g. `2025-12-01T05:00:00Z` for the November 2025 contract). To get the start of the contract month:
```python
expiry = datetime.fromisoformat(event["endDate"].replace("Z", "+00:00"))
start  = (expiry - timedelta(days=15)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
```
Do NOT use `expiry.replace(day=1)` directly — that gives the expiry month (December), not the contract month (November).

### `clobTokenIds` is a JSON string
```python
token_id = json.loads(m["clobTokenIds"])[0]   # must json.loads first
```

### Market question parsing
- Questions with date qualifiers ("after", "before", "starting", "from") are cross-contract and should be filtered out.
- "reach" in the question → upside barrier (H > S)
- "dip" in the question → downside barrier (H < S)
- Strike regex: `r"\$([0-9][0-9,]*)([kK])?"` — handles `$85,000`, `$85k`, `$85K`

---

## 2. Polymarket CLOB API
**Base:** `https://clob.polymarket.com`
**Endpoint:** `/prices-history`
**Parameter:** `market={token_id}`

### Critical: expired vs active markets need different parameters

| Market state | Working params | Broken params |
|---|---|---|
| **Expired / closed** | `interval=all, fidelity=1440` | `startTs + endTs` → **400 error** |
| **Active (live)** | Either works; `startTs/endTs + fidelity=60` for a specific window | `interval=all` returns the full history (large) |

**Safe default that works for both:**
```python
r = requests.get(f'{CLOB}/prices-history', params=dict(
    market=token_id,
    interval='all',
    fidelity=1440,   # 1440 min = daily candles
))
if r.status_code == 400:
    return []        # skip bad token, don't abort
r.raise_for_status()
history = r.json().get("history", [])
```

### Response format
```json
{"history": [{"t": 1738368000, "p": 0.42}, ...]}
```
- `t` is **Unix timestamp in seconds** (not milliseconds)
- `p` is the YES token price as a **decimal probability** (0.0–1.0)
- `fidelity=1440` gives one entry per day; `fidelity=60` gives one per hour

### Aligning to a target datetime
To get the price at midnight UTC on a given date, scan the history and find the closest entry within a tolerance window:
```python
target_unix = int(target_dt.timestamp())
window = 4 * 3600  # ±4 hours
best_p, best_d = None, float('inf')
for row in history:
    delta = abs(row['t'] - target_unix)
    if delta <= window and delta < best_d:
        best_p, best_d = row['p'], delta
```

---

## 3. Deribit DVOL API
**Base:** `https://www.deribit.com/api/v2/public/`
**Endpoint:** `get_volatility_index_data`
**Auth:** None required

### Parameters
```python
params=dict(
    currency='BTC',
    start_timestamp=int(start_dt.timestamp() * 1000),  # milliseconds
    end_timestamp=int(end_dt.timestamp() * 1000),        # milliseconds
    resolution=3600,                                     # seconds per candle
)
```
Valid resolutions: `1`, `60`, `3600`, `43200`, `86400`.

### Response format
```json
{"result": {"data": [[ts_ms, open, high, low, close], ...], "continuation": null}}
```
- Timestamps are **milliseconds** (divide by 1000 to get seconds)
- Values are in **percent** (e.g. `52.3` means 52.3% — divide by 100 for decimal)
- `row[4]` = close — use this as the DVOL snapshot value
- `row[1]` = open — do NOT use for a "current" snapshot; open reflects the start of the candle

### Converting to a pandas Series
```python
data = r.json()['result']['data']
idx  = [datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc) for row in data]
vals = [row[4] / 100.0 for row in data]   # close, percent -> decimal
s = pd.Series(vals, index=idx, name='dvol')
```

### Data availability
- Historical DVOL data is available as far back as the DVOL index launch (~2021). Nov 2025 and Feb 2026 both work.
- A 30-day window at hourly resolution returns ~720 rows — well within any API limit.

---

## 4. CoinGecko API
**Base:** `https://api.coingecko.com/api/v3/`
**Auth:** None required (free tier), but rate limited

### Rate limit reality
The free tier **silently rate-limits after ~10 requests per minute** — it does not always return 429. It may return 200 with unexpected structure, or just a non-200 status. The documented limit of "30 req/min" is unreliable in practice. Never make more than ~10 calls per minute without an API key.

### Use the range endpoint, not the per-day endpoint
Fetching one date at a time (`/coins/bitcoin/history`) exhausts the rate limit fast. For multiple dates, use the range endpoint instead — one call covers the whole period:

```python
r = requests.get(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range',
    params={'vs_currency': 'usd',
            'from': int(start_dt.timestamp()),   # Unix seconds
            'to': int(end_dt.timestamp()),        # Unix seconds
            'precision': '2'},
    headers={'accept': 'application/json'},
)
r.raise_for_status()
prices = r.json()['prices']   # [[ts_ms, price], ...]
```

### Granularity depends on range length
| Range | CoinGecko returns |
|---|---|
| < 1 day | Minutely |
| 1–90 days | **Hourly** |
| > 90 days | **Daily** |

For a 30-day contract window, you get hourly data. Resample to daily by keeping the entry closest to midnight UTC:
```python
daily = {}
for ts_ms, price in prices:
    dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    midnight = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    if midnight not in daily or \
            abs((dt - midnight).total_seconds()) < abs((daily[midnight][0] - midnight).total_seconds()):
        daily[midnight] = (dt, price)
result = {d: p for d, (_, p) in daily.items()}
```

### Per-day endpoint (avoid for bulk use)
If you must fetch a single date:
```python
r = requests.get(
    'https://api.coingecko.com/api/v3/coins/bitcoin/history',
    params={'date': dt.strftime('%d-%m-%Y'), 'localization': 'false'},  # DD-MM-YYYY, not YYYY-MM-DD
    headers={'accept': 'application/json'},
)
price = r.json()['market_data']['current_price']['usd']
```
Note the date format: `DD-MM-YYYY` (day first).

---

## Summary: Recommended Patterns

| Data needed | Recommended call |
|---|---|
| BTC spot for multiple dates | `market_chart/range` once per contract period |
| BTC spot for a single date | `market_chart/range` with a 2-day window (still just 1 call) |
| Polymarket token price history (expired) | `interval=all, fidelity=1440` |
| Polymarket token price history (active) | `startTs/endTs, fidelity=60` for a narrow window |
| Deribit DVOL for a full month | `get_volatility_index_data` with `resolution=3600` once per contract |
| Contract month metadata | Gamma API `/events/slug/{slug}` once per month |
