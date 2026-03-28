# DATA.md — PVOL Data Contract
*What the math layer expects as input. Backend provides this; math layer consumes it.*

---

## Input Tables

### Table 1 — `pvol_ladder_snapshots`
One row per strike per minute.

| Column | Type | Required | Notes |
|---|---|---|---|
| `timestamp` | datetime (UTC) | yes | All strikes in a snapshot within ~5 seconds of each other |
| `contract_month` | string | yes | e.g. `"2026-03"` |
| `strike` | float | yes | H in the formula |
| `yes_price` | float | yes | Last traded YES price — fallback only |
| `yes_bid` | float | nullable | Preferred probability input (use for midquote) |
| `yes_ask` | float | nullable | Preferred probability input (use for midquote) |
| `token_id` | string | yes | Polymarket token identifier |
| `slug` | string | yes | Market slug for audit/tracing |

**Probability selection (math layer applies this):**
```
if yes_bid and yes_ask:
    P_hat = (yes_bid + yes_ask) / 2
else:
    P_hat = yes_price
```

---

### Table 2 — `btc_spot_snapshots`
One row per minute.

| Column | Type | Required | Notes |
|---|---|---|---|
| `timestamp` | datetime (UTC) | yes | Must align with ladder snapshot timestamps |
| `spot` | float | yes | S in the formula |

Spot timestamp must match ladder snapshot timestamp as closely as possible. BTC moves fast; even a few minutes of drift distorts the smile.

---

### Table 3 — `pvol_contract_metadata`
One row per contract month, fetched once.

| Column | Type | Required | Notes |
|---|---|---|---|
| `contract_month` | string | yes | e.g. `"2026-03"` |
| `expiry_timestamp` | datetime (UTC) | yes | Used to compute T |
| `event_slug` | string | yes | Polymarket event slug |

T is computed by the math layer as:
```
T = (expiry_timestamp - snapshot_timestamp).total_seconds() / (365.25 * 86400)
```

---

## What the Math Layer Receives (Per Snapshot)

One snapshot = one timestamp + all active strikes for the current contract month + spot.

```python
@dataclass
class LadderRung:
    strike: float           # H
    yes_price: float        # last traded fallback
    yes_bid: float | None
    yes_ask: float | None

@dataclass
class Snapshot:
    timestamp: datetime
    contract_month: str
    expiry_timestamp: datetime
    spot: float             # S
    rungs: list[LadderRung]
```

---

## Data Quality Rules (Backend Must Follow)

1. **Include all active strikes** — do not cherry-pick; the smile depends on the full ladder shape.
2. **Synchronize timestamps** — all strike quotes within a snapshot within ~5 seconds.
3. **Preserve raw data** — store probabilities exactly as returned. No smoothing, no rounding. Monotonicity cleaning belongs in the math layer.
4. **Never silently drop rungs** — even non-monotone or suspicious strikes must be stored. Math layer handles anomaly detection and flags.

---

## Polling Cadence

- Ladder snapshots: every 60 seconds
- BTC spot: every 60 seconds, synchronized to ladder fetch
- Contract metadata: once per contract month (re-fetch when month rolls over)
