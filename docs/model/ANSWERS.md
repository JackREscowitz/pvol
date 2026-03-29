# Answers to QUESTIONS.md

---

## Q1 — Keeping PVOL updated every minute to match DVOL's cadence

**The problem restated:** DVOL is recomputed continuously from live Deribit options prices. To produce a comparable PVOL time series, we need a rolling feed of Polymarket touch probabilities at a similar cadence.

**Feasibility:** Polymarket's CLOB API supports 1-minute resolution via the `prices-history` endpoint (the `fidelity=1` parameter used in `fetch_backtest_data.ipynb`). Minute-level polling is architecturally achievable.

**Important practical caveat:** Polymarket markets are far less liquid than Deribit options. In practice, prices may not update for 10-30 minutes at a stretch, especially for outer rungs. A minute-level poll will often return an identical price to the previous minute. This is fine -- PVOL will just hold steady until the next genuine price move. It is not a bug; it reflects the lower-frequency nature of prediction market price discovery relative to continuous options markets.

**Polling architecture:** The FastAPI backend runs a background scheduler (e.g. APScheduler) that fires every minute, queries the CLOB API for each active token ID in the current month's ladder, and writes the results to the database. PVOL is then recomputed from the latest snapshot and served to the React frontend via a `/pvol/current` endpoint.

---

## Q2 — PostgreSQL database design

**The teammate's proposal is correct.** This is the right architecture. Specifics:

**Raw prices table** (one row per token per minute):
```
market_snapshots
  id          SERIAL PRIMARY KEY
  captured_at TIMESTAMPTZ NOT NULL
  token_id    TEXT NOT NULL         -- Polymarket YES token ID
  strike      INTEGER NOT NULL      -- dollar strike (e.g. 85000)
  side        TEXT NOT NULL         -- 'upside' or 'downside'
  probability NUMERIC(6,4) NOT NULL -- YES price from CLOB API (0–1)
```

**Computed PVOL table** (one row per minute, after aggregation):
```
pvol_snapshots
  id          SERIAL PRIMARY KEY
  captured_at TIMESTAMPTZ NOT NULL
  pvol        NUMERIC(6,4)          -- touch-band-weighted implied vol
  dvol        NUMERIC(6,4)          -- pulled from Deribit at same timestamp
  gap         NUMERIC(6,4)          -- pvol - dvol
  days_to_expiry INTEGER            -- for labeling and near-expiry warnings
  data_quality TEXT                 -- 'ok', 'warn' (dropped rungs), 'unreliable' (<7 days)
```

This separation matters: storing raw probabilities lets you recompute PVOL with a different formula later without re-fetching from Polymarket. For the historical backfill, the same schema applies -- the `fetch_backtest_data.ipynb` pipeline is adapted to write into `market_snapshots` rather than printing to stdout.

---

## Q3 — How PVOL deteriorates near end of month, and how DVOL handles it

This is the most technically substantive question. The answer has two parts.

### How PVOL deteriorates

The PVOL formula is:

```
σ = |ln(H / S)| / ( √T · |Φ⁻¹(P / 2)| )
```

As the month ends, T shrinks toward zero. Mathematically, the formula is self-consistent -- in a perfect log-normal world, P also shrinks toward zero for untouched upside strikes, and the ratio stays finite. In practice, four things go wrong:

**1. Numerical instability.** √T in the denominator becomes very small. Small errors in P (from bid-ask spread noise or stale prices) get amplified into large swings in σ. A probability that should be 2% but is quoted as 2.5% due to a stale market produces a very different σ when T = 3 days versus T = 25 days.

**2. Liquidity collapse.** Near expiry, traders withdraw from thin outer-rung markets (low expected profit, high binary risk). Spreads widen. Prices become stale and stop reflecting genuine belief. The signal-to-noise ratio falls sharply.

**3. Non-monotone rungs worsen.** Stale prices on outer rungs are the primary cause of the non-monotone violations already observed in the February data (e.g. $120k pricing higher than $115k). Near expiry this becomes more frequent as more rungs go stale. More rungs get dropped, the smile has fewer points, and the PVOL estimate becomes based on fewer, more central rungs.

**4. Strike crossings.** Strikes that BTC has already passed during the month get removed from the ladder (handled in `fetch_backtest_data.ipynb` step 5). Near month end with high volatility, many strikes may have been crossed, leaving an extremely short ladder.

The combined effect: PVOL variance increases, its correlation with DVOL degrades, and the index becomes unreliable in the final 5-7 days.

### How DVOL handles the same problem

DVOL (and VIX, which uses the same methodology) solves this with **two-contract-month blending**. At all times, two expiries are used:

- **Near-month** (front contract, weeks away)
- **Next-month** (following contract, ~5 weeks further out)

The weight shifts linearly so the output always represents exactly 30 days of expected vol:

```
weight_near = (T_far - 30 days) / (T_far - T_near)
weight_far  = (30 days - T_near) / (T_far - T_near)
DVOL = weight_near × IV_near + weight_far × IV_far
```

When T_near drops below 7 days, VIX drops the front month entirely and rolls to the next two contracts. This prevents the near-expiry instability from ever entering the index.

### How PVOL should handle it — evaluation of the teammate's proposal

**Teammate's proposal:** two charts -- one showing PVOL only at month start, one showing the full intramonth series.

**Verdict: pragmatically correct for a hackathon, with one enhancement.**

The two-chart approach is honest and avoids misrepresenting the near-expiry signal. The month-start snapshot chart is the clean, reliable view; the intramonth chart shows the full picture with appropriate caveats. This is a good demo story: "Here's the reliable signal; here's how it evolves across the month."

The enhancement: rather than silently showing bad data in the intramonth chart, add a visual indicator when days-to-expiry drops below 7. A grayed-out region or a dashed line after that point communicates that the signal is degraded without hiding it. This is stored in the `data_quality` field of `pvol_snapshots`.

**Full VIX-style two-month blending** is the correct long-term solution but is out of scope for the hackathon. It requires querying next month's Polymarket markets simultaneously, which adds pipeline complexity. It should be documented as the primary future work item.