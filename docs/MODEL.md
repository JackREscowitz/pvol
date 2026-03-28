# MODEL.md — PVOL Quantitative Reference
*Authoritative source for all math and implementation decisions.*

---

## 1. Core Modeling Assumption

We model the log-price of Bitcoin as a driftless Brownian motion:

```
X_t = ln(S_t) = ln(S_0) + σ · W_t
```

where W_t is a standard Brownian motion and σ is the (constant, annualized) volatility we are trying to extract.

This is a **zero-drift log-Brownian first-passage approximation**. Three properties make it the right choice for this context:

- **Closed-form inversion.** The touch probability under this model has an exact analytic form, enabling direct inversion for σ without numerical root-finding.
- **Computational robustness.** No drift parameter to estimate; no covariance matrix to invert. One formula, one unknown.
- **Suitable for sparse ladders.** Polymarket offers ~10 strikes per month. Fitting a richer model (stochastic vol, jumps) would be underidentified. The zero-drift model extracts the maximum information available from each rung independently.

The zero-drift assumption introduces modest bias at far-from-money strikes where BTC's risk-neutral drift is non-negligible relative to the log-distance term. This is a known approximation, stated openly in the product spec.

---

## 2. Reflection Principle Derivation

Let H be a barrier, S the current spot, T the time horizon in years, and σ the annualized volatility.

**Step 1 — Brownian hitting probability.**
Under the zero-drift log-Brownian model, the probability that S_t hits barrier H at any time t in [0, T] is given by the reflection principle:

```
P_touch(H) = 2 · Φ( -|ln(H/S)| / (σ · √T) )
```

where Φ is the standard normal CDF. The factor of 2 arises from the reflection principle: every path that ends below the barrier after having touched it corresponds to a reflected path that ends above it, doubling the probability mass relative to the terminal crossing probability.

**Step 2 — Why log-distance.**
We use |ln(H/S)| rather than |H - S| because asset prices are log-normally distributed. Equal percentage moves (not equal dollar moves) are equally likely under this model. Log-distance is the natural metric.

**Step 3 — Inversion for σ.**
Given observed touch probability P_hat, set P_touch(H) = P_hat and solve:

```
P_hat = 2 · Φ( -|ln(H/S)| / (σ · √T) )

=> Φ⁻¹(P_hat / 2) = -|ln(H/S)| / (σ · √T)

=> σ = |ln(H/S)| / ( √T · |Φ⁻¹(P_hat / 2)| )
```

This is the core PVOL formula. Φ⁻¹ is the inverse standard normal CDF (scipy.stats.norm.ppf in Python).

---

## 3. Probability Input Selection

Define P_hat as the **market-implied touch probability proxy** for a given Polymarket rung.

**Production rule (in priority order):**

1. If both bid and ask are available for the YES token: use the midquote.
   ```
   P_hat = (bid + ask) / 2
   ```
2. If bid/ask unavailable: use the last traded YES price.
   ```
   P_hat = last_traded_price
   ```
3. In all cases, clamp P_hat away from 0 and 1 for numerical stability:
   ```
   P_hat = clamp(P_hat, epsilon, 1 - epsilon)
   ```
   Recommended epsilon = 0.001. This prevents Φ⁻¹(P_hat/2) from diverging.

**Rationale for midquote preference.** Last traded price reflects a historical transaction; the midquote reflects current market-maker beliefs. For a live volatility index, the midquote is a better proxy for the current probability consensus.

---

## 4. Ladder Cleaning Rules

**Ladder structure.** At any snapshot, the Polymarket BTC ladder consists of:
- **Upside rungs:** strikes H > S, ordered H_1 < H_2 < ... < H_n (increasing distance above spot)
- **Downside rungs:** strikes H < S, ordered H_1 > H_2 > ... > H_m (increasing distance below spot)

Each side is treated independently.

**Monotonicity requirement.** Touch probabilities must be strictly decreasing with barrier distance:
```
P(H_1) > P(H_2) > ... > P(H_n)    (upside)
P(H_1) > P(H_2) > ... > P(H_m)    (downside)
```
A more distant barrier is always harder to reach. Any violation implies a market pricing error or thin liquidity.

**MVP policy — drop and flag.**
Scan each ladder from the innermost rung outward. At the first violation of strict monotonicity, drop that rung and all rungs beyond it on the same side. Emit a `non_monotone_ladder` data quality flag.

**Future policy — isotonic regression repair.**
Future versions will apply isotonic regression to the full probability sequence before inversion, projecting onto the nearest monotone-decreasing sequence in L2. This preserves more rungs and produces a smoother smile.

---

## 5. Strike-Level IV Extraction

Per-rung workflow:

1. **Choose probability proxy.** Apply the selection rule from Section 3 to obtain P_hat.
2. **Validate inputs.** Skip the rung if:
   - P_hat is missing after both fallbacks
   - H <= 0 or S <= 0
   - T <= 0 (expired or not yet active)
   - Rung was dropped by ladder cleaning (Section 4)
3. **Compute T.** T = (expiry_datetime - snapshot_datetime).total_seconds() / (365.25 * 86400). Use UTC throughout.
4. **Invert for σ.**
   ```
   d = |ln(H / S)|
   sigma = d / (sqrt(T) * abs(norm.ppf(P_hat / 2)))
   ```
5. **Attach validity flags.** Record any applicable flags from Section 7 alongside the sigma value.

---

## 6. PVOL Index Aggregation

**Touch-band weights.** Order all valid rungs by increasing barrier distance from spot (upside and downside combined, or per-side if reporting separately). Assign weights:

```
w_i = P_i - P_{i+1}
```

where P_i > P_{i+1} (guaranteed by ladder cleaning). The final rung receives weight equal to P_final (its remaining tail probability).

**PVOL index.**
```
PVOL = Σ(w_i · σ_i) / Σ(w_i)
```

Rungs with higher touch probability mass (i.e., where the crowd has concentrated conviction) receive proportionally more weight.

**Fallback.** If fewer than 2 valid rungs remain after ladder cleaning, PVOL falls back to the simple average of all remaining valid σ_i values. Emit an `insufficient_valid_strikes` flag.

---

## 7. Data Quality Flags

Flags are emitted per snapshot and surfaced as dashboard warnings.

| Flag | Condition |
|---|---|
| `near_expiry` | T < 7 / 365.25 (fewer than 7 days to expiry) |
| `non_monotone_ladder` | One or more rungs dropped for monotonicity violation |
| `insufficient_valid_strikes` | Fewer than 2 valid rungs available after cleaning |
| `clamped_probability` | Any P_hat was clamped at epsilon or 1 - epsilon |
| `missing_midpoint_fallback` | Any rung used last-traded-price fallback (no bid/ask) |
| `large_bid_ask_spread` | Any rung has (ask - bid) / midquote > 0.10 (10% relative spread) |

Multiple flags may be active simultaneously. The dashboard displays all active flags.

---

## 8. Future Quant Upgrades

These items are out of scope for the hackathon MVP. They are documented here as a roadmap.

1. **Isotonic regression monotonicity repair.** Replace the drop-and-flag policy with an L2 projection onto the monotone cone, preserving more rungs and producing a smoother smile.

2. **Probability smoothing before inversion.** Fit a parametric curve (e.g. logistic or spline) to the raw touch probabilities before inverting rung-by-rung. Reduces noise propagation from thin outer markets.

3. **Constant-maturity two-month blending.** Blend adjacent contract months using time-weighted interpolation, producing a rolling 30-day PVOL analogous to VIX methodology. Removes the saw-tooth artifact at month boundaries.

4. **Drift correction.** Incorporate the risk-neutral drift term (approximately r - q for BTC) into the first-passage formula. Reduces bias at far-from-money strikes, especially when BTC is in strong trending regimes.

5. **Jump-risk correction.** Augment the log-Brownian model with a Poisson jump component. Particularly relevant for extreme upside rungs (e.g. $120k+) where jump probability dominates diffusion probability.

6. **Realized-vol validation.** Backtest PVOL readings against subsequent 30-day realized vol (using minute-level BTC price data). Quantify PVOL forecast bias and root-mean-squared error relative to DVOL.

7. **PVOL-DVOL spread predictive testing.** Test whether the PVOL-DVOL gap predicts subsequent realized vol or BTC return direction. This is the core hypothesis of the product and requires at least 6 months of historical data to test meaningfully.
