# Product Spec — PVOL: Polymarket Implied Volatility Index
*YHack 2026 · Prediction Markets Track*

---

## 1. Problem & Motivation

Every day, traders on Deribit price Bitcoin options — puts and calls at dozens of strikes — and from those prices, analysts can extract a single number: implied volatility (IV). IV is the market's forward-looking estimate of how wildly Bitcoin is likely to move. It is one of the most watched numbers in crypto finance. Deribit's DVOL index publishes it continuously, derived from the bets of professional options traders.

But Deribit only captures one crowd. There is a second crowd — thousands of participants on Polymarket, putting real money behind predictions about where Bitcoin's price will travel during the coming month. These markets are financially staked and forward-looking. And they have been almost entirely untapped as a volatility signal.

This product extracts implied volatility from Polymarket's prediction markets for the first time. The result — PVOL — is a volatility index derived from the crowd of retail and semi-professional prediction market participants, compared live against DVOL from institutional options traders. The gap between them is original information that did not previously exist in a form anyone could look at.

---

## 2. The Math

### Plain English First

Polymarket hosts monthly markets like *"Will Bitcoin touch $85,000 in March?"* Traders buy YES or NO shares, and the price of a YES share reflects the crowd's collective probability that Bitcoin reaches that level at any point during the month.

These markets are, mathematically, **one-touch barrier options**. A touch probability encodes something deeper than just a directional bet — it encodes how volatile the crowd expects Bitcoin to be. A highly volatile asset is more likely to graze a distant price level during a month, even if it ends up far from it. A calm asset rarely does. The touch probability therefore implicitly prices in a volatility assumption.

We can solve for that assumption. Given a touch probability, a current price, a strike price, and the time remaining in the month, we can invert the barrier option formula to recover the **implied volatility** — the volatility level that would produce exactly that touch probability under standard asset price dynamics.

Do this for every rung in the Polymarket ladder and you get a **volatility smile**: implied volatility at each strike, just like an options chain on Deribit.

### The Formula

```
σ = |ln(H / S)| / ( √T · |Φ⁻¹(P / 2)| )
```

Where:

| Symbol | Meaning |
|---|---|
| σ | Implied volatility (what we're solving for, annualized) |
| H | Strike price (the level Polymarket asks about, e.g. $85,000) |
| S | Current spot price of Bitcoin |
| T | Time remaining in the month, in years |
| P | Touch probability (the YES share price from Polymarket) |
| Φ⁻¹ | Inverse of the standard normal CDF |

**In plain English:** if the crowd prices YES shares at 55% for the $85k market, we ask — what volatility level would make a 55% touch probability mathematically correct? The answer is PVOL at that strike.

A useful cross-check: touch probability is approximately twice the terminal probability (the probability of closing above the strike at month end), a consequence of the reflection principle for log-normal assets. The formula above is the full inversion of that relationship.

### Assumption

The formula assumes zero drift — that Bitcoin has no expected directional return over the period. This is a known approximation (the real risk-neutral drift is small but nonzero). It introduces a slight bias, especially at strikes far from spot. We surface this as a stated caveat rather than attempting a correction.

---

## 3. The Product

### View 1 — PVOL Smile

A chart showing implied volatility on the Y-axis and strike price on the X-axis. Each point is one Polymarket rung, inverted into an implied vol using the formula above. The result is the crowd's volatility smile — the same kind of chart options traders use to see how the market prices risk at different strike levels.

The smile often has a characteristic shape: higher implied vol at the wings (far-from-money strikes) than near the center. Whether the smile tilts left or right (more downside fear vs. upside enthusiasm) is itself informative.

### View 2 — PVOL Index

A single number summarizing the full smile — the crowd's aggregate implied volatility for Bitcoin over the current month. Displayed prominently alongside DVOL (Deribit's published IV index) as a reference benchmark.

**Aggregation method:** probability-mass-weighted average. Each rung's implied vol is weighted by the probability mass in its price band (computed by differencing adjacent touch probabilities, the same step already performed in the skew model). This is the most financially motivated approach: rungs where the crowd has concentrated conviction count more than thin outer markets.

### View 3 — The Gap (Core Feature)

The spread between PVOL and DVOL, shown as a chart over time. This is the headline feature. When the crowd on Polymarket is pricing significantly higher (or lower) volatility than professional options traders on Deribit, that divergence is visible, labeled, and explained.

A positive gap (PVOL > DVOL) means retail prediction market participants expect more volatility than institutional options desks. A negative gap means the crowd is more sanguine than the professionals. Neither is obviously "right" — the gap is a signal, not a verdict.

---

## 4. PVOL vs. DVOL

Deribit and Polymarket represent two distinct crowds. Deribit is institutional: professional vol traders, market makers, and hedge funds with tight spreads and deep liquidity. Polymarket is broader: retail participants, researchers, and prediction market enthusiasts expressing genuine conviction with real money.

Both are financially staked. Both are forward-looking. But they are not the same market, and they do not always agree.

The central bet of this product is that the gap between them carries information. When retail crowds price more fear than institutions, it may signal a sentiment extreme. When they price less, it may reflect retail complacency that institutions have already priced away. Validating this empirically is future work — but the gap is real, observable, and has never been published in this form before.

PVOL does not claim to be more accurate than DVOL. DVOL is derived from a deeper, more liquid market. PVOL is a complementary signal from a different crowd. The comparison is the product.

---

## 5. Data Sources & Tech Stack

**Polymarket** — Gamma API (`gamma-api.polymarket.com`) for event and market metadata; CLOB API (`clob.polymarket.com/prices-history`) for YES token price history at arbitrary timestamps. Monthly BTC events follow a predictable slug pattern (`what-price-will-bitcoin-hit-in-{month}-{year}`), enabling both live and historical data fetches using the same pipeline established in `fetch_backtest_data.ipynb`.

**Deribit** — DVOL index endpoint as a single number (their published 30-day IV estimate). No options chain query required; the full per-strike smile comparison is out of scope.

**BTC spot price** — CoinGecko history API (`api.coingecko.com/api/v3/coins/bitcoin/history`) for historical spot, matching the existing fetch pipeline.

**Tech stack** — React frontend, FastAPI backend. FastAPI serves PVOL and DVOL data; React renders the three dashboard views.

---

## 6. Hackathon Scope

**In scope for the demo:**
- Live PVOL smile extraction from current Polymarket data
- PVOL index (single aggregated number, probability-mass-weighted)
- Live DVOL comparison panel showing the gap
- Historical PVOL vs. DVOL time series chart (reconstructed from Polymarket CLOB price history and Deribit DVOL history)
- React + FastAPI dashboard with all views

**Out of scope:**
- Rolling constant-maturity 30-day index (requires blending adjacent contract months, as VIX does)
- Drift correction beyond the zero-drift approximation
- Backtesting the divergence signal against subsequent realized vol
- DCA execution or portfolio tracking
- Multi-asset support (ETH, other Polymarket markets)

---

## 7. Limitations & Honest Caveats

| # | Limitation | Severity | Notes |
|---|---|---|---|
| 1 | **Zero-drift assumption** | Low-Medium | Risk-neutral drift is small for monthly horizons. Stated as a caveat; introduces modest bias at far-from-money strikes. |
| 2 | **Non-monotone outer rungs** | Medium | Polymarket occasionally prices a farther strike higher than a closer one. The IV inversion is undefined at these points. Policy: drop offending rungs, surface a data quality flag. |
| 3 | **Coarse strike grid** | Low-Medium | $5k spacing yields ~10 data points for the smile. Fitting is noisy at the wings. |
| 4 | **Intramonth time decay** | Medium | PVOL is noisier near expiry (small T in denominator). Readings in the final week of the month should be treated cautiously. |
| 5 | **No empirical validation of the gap signal** | Medium | The PVOL/DVOL spread is observable and interpretable but not yet backtested against realized vol or BTC returns. |

---

## 8. Design Decisions

Resolved decisions that shaped the implementation scope.

**PVOL aggregation: probability-mass-weighted average.**
Each rung's implied vol is weighted by its probability mass band. Rungs where the crowd has concentrated conviction dominate the index; thin outer markets contribute proportionally less. Simple average and ATM-only were rejected — the former treats all rungs equally regardless of liquidity, the latter discards most of the data.

**Non-monotone rungs: drop and flag.**
When Polymarket prices a farther strike higher than a closer one (logically impossible — a more distant level must be harder to reach), the IV inversion yields an imaginary number. Those rungs are dropped from the smile and flagged with a visible data quality indicator on the dashboard. Silent dropping would mislead; interpolation adds complexity without mathematical grounding.

**Drift: zero-drift approximation, stated caveat.**
BTC's monthly risk-neutral drift is roughly 0.4% (annualized rate / 12). Monthly vol is ~20-25% (80% annualized / √12). The drift term is noise relative to the vol signal at this time horizon and is not worth correcting. It is stated as a known approximation in the limitations section.

**Time normalization: label with days remaining, warn in final week.**
PVOL readings become noisy as expiry approaches because √T shrinks in the denominator. Full VIX-style two-month blending is out of scope. Instead, every PVOL reading is labeled with days remaining to expiry, and the dashboard surfaces a warning when fewer than 7 days remain in the current contract month.

**Historical data: in scope via CLOB price history.**
Polymarket's CLOB API (`prices-history` endpoint) supports arbitrary timestamp queries, enabling PVOL reconstruction for past months. The `fetch_backtest_data.ipynb` pipeline already demonstrates this for February 2026. The historical PVOL vs. DVOL divergence chart is in scope for the demo.

**DVOL: direct index endpoint, single number.**
Deribit publishes DVOL via a direct REST endpoint. No options chain query or Black-Scholes inversion is required. The per-strike Deribit smile comparison is out of scope.

**Dashboard layout: gap as headline, single page.**
The PVOL/DVOL spread is the most legible feature for a two-minute demo. Layout: gap number and time series chart at the top as the headline, PVOL smile below as supporting detail. Single page; no tabs.

**Month boundary: frontmost active contract.**
At any point in time, the pipeline queries the active monthly event with the nearest end date. When a month expires and the next opens, the pipeline automatically shifts to the new contract. No cross-month blending.
