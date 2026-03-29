# Quant Feedback from Ethan Lin (2026-03-27)

Notes from Ethan's review of the Polymarket DCA signal model. Organized by topic with implementation notes.

---

## 1. Deribit Options as a Supplementary Signal

Deribit is a crypto derivatives exchange where institutional and professional traders price options on BTC. From these options, you can back out:

- **Implied volatility (IV)**: the market's forward-looking estimate of price uncertainty
- **Implied skew**: whether the market prices downside puts more expensively than upside calls (or vice versa) -- a directional sentiment signal derived from real money positions

Ethan's framing: Polymarket and Deribit are complementary sources of the same underlying signal. Polymarket captures retail/crowd opinion with skin in the game; Deribit captures professional/institutional trader positioning. You could either blend both inputs into a composite score or use one to validate the other.

**Ethan's note on Polymarket's advantage:**
> "I do think there's merit to using polymarket specifically though as its more of a place where people express opinions."

So Polymarket remains the core; Deribit is an optional enrichment layer.

**Implementation path:** Query Deribit's options chain for BTC, extract IVs at various strikes, compute the volatility smile/skew. This is a separate API integration with meaningful complexity.

---

## 2. Touch-to-Terminal Probability Conversion (the 2x Heuristic)

**The problem:** Polymarket markets measure whether BTC *reaches* a strike at any point during the month (a one-touch option). What you often want for a cleaner probability distribution is: "what is the probability BTC *closes above/below* this strike at month end?" (a terminal/European-style probability).

**The heuristic:** From barrier option theory, for a log-normal asset:

```
P(closing above X at expiry) ≈ P(touching X during period) / 2
```

So if the market prices YES shares on "BTC reaches $85k in February" at 55%, the implied terminal probability of BTC closing above $85k is roughly 27.5%.

**Caveats:**
- This is an approximation, not exact. It assumes a specific relationship between barrier and terminal probabilities that holds cleanly only for a driftless geometric Brownian motion.
- Ethan flagged this is "not perfect but maybe good enough for now."
- Applied consistently across all rungs, it shifts all probabilities down by ~half but preserves the relative shape of the distribution, so the skew score itself may be less sensitive to this correction than the raw probabilities.

**Implementation path:** After fetching rung probabilities from Polymarket, divide all values by 2 before computing skew. Simple one-liner change.

---

## 3. Upward Bias in the Skew Score

Ethan flagged two structural issues with the current skew score:

**Issue A -- Values biased above 0.5:**
The score may be systematically above neutral even in flat markets. Likely causes: more upside markets listed on Polymarket than downside ones, and the ladder construction (Approach B) rewards a longer upside ladder.

**Issue B -- Compressed range (values rarely outside 0.3--0.7):**
Real-world market skew measures rarely reach extreme values. A score of 0.85 or 0.15 would be extraordinary. The current 0--1 scale wastes resolution -- most readings will cluster in the middle third.

**Implications:**
- Consider rescaling the final score to the empirically observed range (e.g., linearly map [0.3, 0.7] → [0, 100]) after collecting more data points
- The tier thresholds (Strong / Moderate / Neutral) may need recalibration once you have a distribution of historical scores to work with
- The distance cap in Approach C already partially addresses Issue A by enforcing ladder symmetry

---

## 4. Log-Space Distances (Most Technically Substantive)

**The problem with raw dollar distances:**
Approach B/C currently weights each rung by `|strike - spot|` in raw dollars. This is financially incorrect because asset prices are multiplicative, not additive. A $10k move from a $20k spot (50% return) is very different from a $10k move from an $80k spot (12.5% return). Raw dollar weighting treats them identically.

**The fix:** Replace raw dollar distance with log-distance:

```
distance = |log(strike / spot)|
         = |log(strike) - log(spot)|
```

This reflects the fact that BTC (like most assets) follows approximately log-normal dynamics -- equal *percentage* moves are equally meaningful regardless of the absolute price level.

**Practical benefit -- fixes the asymmetry problem:**
With BTC at $78,726, the raw upside ladder reaches to $150k (+$71k) while the downside ladder reaches to $35k (-$44k). In log-space:

```
log(150,000 / 78,726) = 0.645   (upside extent)
log(78,726 / 35,000)  = 0.811   (downside extent)
```

The asymmetry shrinks dramatically compared to raw dollar distances ($71k vs $44k). Log compression naturally brings the two sides closer to parity without needing an arbitrary dollar cap.

**Implementation path:**
In the rung weighting loop, replace:
```python
distance = abs(strike - spot)
```
with:
```python
distance = abs(math.log(strike / spot))
```
All other logic stays the same. Combine with Approach C's distance cap (applied in log-space, e.g., cap at `log(1.4)` ≈ 0.34 on each side for ~40% from spot).

---

## 5. Distribution Fitting

Rather than using a weighted average heuristic to produce a single skew score, fit a parametric probability distribution to the full set of (strike, probability) pairs you have from Polymarket. Then compute the **statistical skewness** of that fitted distribution.

**How it would work:**
1. Convert touch probabilities to terminal probabilities (using the 2x heuristic from Section 2)
2. Treat each (strike, terminal probability) pair as a point on a CDF
3. Differentiate to get an implied PDF
4. Fit a distribution (log-normal, skew-normal, or mixture) to those PDF points
5. Read off the fitted distribution's skewness parameter directly

**Advantages:**
- Principled: skewness has a precise statistical meaning
- Produces a full distribution, not just a score -- opens the door to confidence intervals, percentiles, etc.
- Eliminates arbitrary design choices about distance weighting

**Disadvantages:**
- Significantly more complex to implement correctly
- Requires enough liquid rung markets to fit a distribution (the coarse $5k ladder may not have enough points)
- Fitting instability when outer rung probabilities are non-monotone (already an observed issue with thin outer markets)

Ethan framed this as an exploratory idea, not a near-term requirement.

---

## Priority Order

| Priority | Suggestion | Effort | Impact |
|----------|-----------|--------|--------|
| 1 | **Log-space distances** | Low -- swap one formula | High -- fixes structural asymmetry bias, more financially correct, reduces need for arbitrary dollar cap |
| 2 | **Touch-to-terminal 2x correction** | Very low -- divide by 2 | Medium -- makes the probability interpretation cleaner; minimal effect on skew ratio itself |
| 3 | **Score range recalibration** | Low -- rescale after data collection | Medium -- tighten tier thresholds to match observed score distribution |
| 4 | **Deribit options signal** | High -- new API + options math | Medium -- interesting validation layer, but Polymarket alone is defensible |
| 5 | **Distribution fitting** | High -- stats complexity | Low (now) -- elegant but requires more liquid market data than currently available |

**Recommended immediate action:** Implement log-space distances (Priority 1) in Approach C of `skew_model.ipynb`. This is a one-line formula change with outsized payoff -- it addresses the asymmetry problem more cleanly than the current dollar cap approach and is financially better motivated.
