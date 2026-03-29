import PivoltLogo from "./PivoltLogo.jsx";
import "./Methodology.css";

import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export default function Methodology({ onBack }) {
  return (
    <div className="meth">

      {/* ── Nav ── */}
      <nav className="meth__nav">
        <PivoltLogo fontSize={15} />
        <button className="meth__nav-back" onClick={onBack}>← Back</button>
      </nav>

      {/* ── Hero ── */}
      <section className="meth__hero">
        <div className="meth__hero-badge">Methodology · YHack 2026</div>
        <h1 className="meth__hero-title">How PVOL Works</h1>
        <p className="meth__hero-sub">
          Polymarket monthly BTC markets are one-touch barrier options.
          Their prices encode a volatility assumption — we invert the barrier
          formula to extract it.
        </p>
      </section>

      {/* ── Content ── */}
      <div className="meth__content">

        {/* 1. The Insight */}
        <section className="meth__section">
          <div className="meth__section-tag">01 · The Insight</div>
          <h2 className="meth__section-title">Prediction Markets as Volatility Signals</h2>
          <p>
            Every month, Polymarket runs markets like <em>"Will Bitcoin touch $90,000 in March?"</em>
            Traders buy YES or NO shares with real money, and the YES price reflects the crowd's
            collective probability that Bitcoin reaches that level at any point during the month.
          </p>
          <p>
            These are mathematically identical to <strong style={{ color: "#c8c8e0" }}>one-touch barrier options</strong> —
            a standard instrument in options markets. A touch probability is not just a directional bet;
            it encodes how volatile the underlying asset is expected to be. A highly volatile asset is
            more likely to graze a distant price level during a month, even if it ends the month far from
            it. A calm asset rarely does.
          </p>
          <p>
            Given a touch probability, a current price, a strike, and time remaining,
            we can invert the barrier formula to recover the <strong style={{ color: "#c8c8e0" }}>implied volatility</strong> —
            the volatility level that would produce exactly that probability under standard asset price dynamics.
            Do this for every rung in the Polymarket ladder and you get a full volatility smile: implied vol
            at each strike, comparable to an options chain on Deribit.
          </p>
          <p>
            Deribit's{" "}
            <a
              className="meth__link"
              href="https://www.deribit.com/statistics/BTC/volatility-index"
              target="_blank"
              rel="noopener noreferrer"
            >
              DVOL index
            </a>{" "}
            is the institutional benchmark: derived from professional options traders,
            market makers, and hedge funds with tight spreads and deep liquidity.
            PVOL is the complementary signal from a different crowd entirely — retail participants
            and researchers expressing financially-staked conviction on prediction markets.
            The comparison between them is the product.
          </p>
        </section>

        {/* 2. The Formula */}
        <section className="meth__section">
          <div className="meth__section-tag">02 · The Formula</div>
          <h2 className="meth__section-title">Reflection Principle Inversion</h2>
          <p>
            Under a zero-drift log-Brownian model, the probability that spot price S touches
            barrier H at any time before T is given by the reflection principle:
          </p>

          <div className="meth__formula">
            <span className="meth__formula-line">
              P_touch(H) = 2 · Φ( −|ln(H/S)| / (σ · √T) )
            </span>
          </div>

          <p>
            Setting P_touch equal to the observed market probability P and solving for σ:
          </p>

          <div className="meth__formula">
            <span className="meth__formula-line">

              Φ⁻¹(P / 2) = −|ln(H/S)| / (σ · √T)
            </span>

            <span className="meth__formula-line">
              σ = |ln(H/S)| / ( √T · |Φ⁻¹(P/2)| )
            </span> </div>

          <p>This is the core PVOL formula. Variable definitions:</p>

          <table className="meth__vars">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><InlineMath math="σ" /></td><td>Implied volatility (annualized) — what we solve for</td></tr>
              <tr><td><InlineMath math="H" /></td><td>Strike price (the barrier level Polymarket asks about)</td></tr>
              <tr><td><InlineMath math="S" /></td><td>Current Bitcoin spot price</td></tr>
              <tr><td><InlineMath math="T"></InlineMath></td><td>Time remaining in the month, in years</td></tr>
              <tr><td><InlineMath math="P" /></td><td>Market-implied touch probability (YES midquote; last traded price as fallback)</td></tr>
              <tr><td><InlineMath math="Φ"></InlineMath></td><td>Standard normal CDF</td></tr>
              <tr><td><InlineMath math="Φ⁻¹"></InlineMath></td><td>Inverse standard normal CDF (norm.ppf in Python)</td></tr>
            </tbody>
          </table>

          <p>
            <strong style={{ color: "#c8c8e0" }}>Why log-distance, not dollar distance?</strong>{" "}
            Asset prices follow log-normal dynamics: equal percentage moves are equally likely,
            not equal dollar moves. |ln(H/S)| is the natural distance metric in this framework.
          </p>
          <p>
            <strong style={{ color: "#c8c8e0" }}>Why zero drift?</strong>{" "}
            Assuming no expected return yields a closed-form inversion with no parameters to estimate.
            BTC's monthly risk-neutral drift (~0.4%) is small relative to monthly realized vol (~20-25%),
            so the approximation introduces only modest bias, especially near the money.
            With only ~10 rungs per contract, fitting a richer model would be underidentified.
          </p>
        </section>

        {/* 3. The Pipeline */}
        <section className="meth__section">
          <div className="meth__section-tag">03 · The Pipeline</div>
          <h2 className="meth__section-title">From Raw Market Price to PVOL Index</h2>
          <p>
            Six steps transform a raw Polymarket ladder snapshot into a single PVOL reading:
          </p>

          <ol className="meth__steps">
            <li className="meth__step">
              <span className="meth__step-num">01</span>
              <div className="meth__step-body">
                <strong>Fetch YES token prices</strong>
                <span>
                  Query Polymarket's CLOB API for each active token ID in the current month's
                  ladder. Each token corresponds to one strike (e.g. "Will BTC touch $90,000?").
                  Retrieve bid, ask, and last traded price.
                </span>
              </div>
            </li>
            <li className="meth__step">
              <span className="meth__step-num">02</span>
              <div className="meth__step-body">
                <strong>Select probability input</strong>
                <span>
                  Prefer the midquote (bid + ask) / 2 — it reflects current market-maker beliefs
                  rather than a historical trade. Fall back to last traded price if bid/ask are
                  unavailable. Clamp all values to [0.001, 0.999] to prevent Φ⁻¹ from diverging.
                </span>
              </div>
            </li>
            <li className="meth__step">
              <span className="meth__step-num">03</span>
              <div className="meth__step-body">
                <strong>Fit logistic smoothing</strong>
                <span>
                  Fit a parametric logistic curve to the raw touch probability sequence before
                  inverting. This reduces noise propagation from thin outer markets where bid-ask
                  spreads are wide and prices can be stale.
                </span>
              </div>
            </li>
            <li className="meth__step">
              <span className="meth__step-num">04</span>
              <div className="meth__step-body">
                <strong>Clean the ladder</strong>
                <span>
                  Touch probabilities must strictly decrease with barrier distance — a more distant
                  level is always harder to reach. Scan from the innermost rung outward. At the first
                  monotonicity violation, drop that rung and all rungs further out on the same side.
                  Emit a data quality flag.
                </span>
              </div>
            </li>
            <li className="meth__step">
              <span className="meth__step-num">05</span>
              <div className="meth__step-body">
                <strong>Invert each valid rung</strong>
                <span>
                  Apply σ = |ln(H/S)| / (√T · |Φ⁻¹(P/2)|) independently to each rung that
                  survived ladder cleaning. Each rung yields one implied volatility point.
                </span>
              </div>
            </li>
            <li className="meth__step">
              <span className="meth__step-num">06</span>
              <div className="meth__step-body">
                <strong>Aggregate: touch-band-weighted average</strong>
                <span>
                  Assign each rung a weight w_i = P_i − P_&#123;i+1&#125; (adjacent probability difference).
                  Rungs where the crowd has concentrated conviction carry more weight than thin outer markets.
                  PVOL = Σ(w_i · σ_i) / Σ(w_i).
                </span>
              </div>
            </li>
          </ol>
        </section>

        {/* 4. PVOL vs DVOL */}
        <section className="meth__section">
          <div className="meth__section-tag">04 · PVOL vs DVOL</div>
          <h2 className="meth__section-title">Two Crowds, One Signal</h2>
          <p>
            PVOL and DVOL are not competing estimates of the same truth — they are readings from
            two structurally different markets.
          </p>
          <p>
            <strong style={{ color: "#c8c8e0" }}>Deribit DVOL</strong> is derived from professional
            options traders, market makers, and hedge funds with deep liquidity and tight spreads.
            Its methodology closely follows the VIX: a variance-swap replication using the full
            options chain, blended across two expiries to hold constant maturity at 30 days.
          </p>
          <p>
            <strong style={{ color: "#c8c8e0" }}>Polymarket PVOL</strong> comes from a broader retail
            and research community putting real money behind price predictions. Markets are
            less liquid, strikes are coarser ($5k spacing), and prices update less frequently —
            but the crowd is genuinely distinct from the Deribit order book.
          </p>
          <p>
            The gap (PVOL minus DVOL) is the headline feature. A positive gap means the prediction
            market crowd is pricing more volatility than institutional options desks. A negative gap
            means the crowd is more sanguine. Neither is obviously correct — the gap is a signal,
            not a verdict.
          </p>

          <div className="meth__callout">
            <strong>Near-expiry warning:</strong> PVOL becomes unreliable in the final 7 days
            of a contract month. As T approaches zero, small errors in market prices get amplified
            in the denominator (√T), spreads widen on outer rungs, and more rungs fail the
            monotonicity check. DVOL avoids this by blending two expiries and rolling the front
            month when fewer than 7 days remain — a future improvement for PVOL.
          </div>

          <p>
            See the live{" "}
            <a
              className="meth__link"
              href="https://www.deribit.com/statistics/BTC/volatility-index"
              target="_blank"
              rel="noopener noreferrer"
            >
              Deribit DVOL page
            </a>{" "}
            for the institutional benchmark methodology.
          </p>
        </section>

        {/* 5. Limitations */}
        <section className="meth__section">
          <div className="meth__section-tag">05 · Limitations</div>
          <h2 className="meth__section-title">Known Caveats</h2>

          <table className="meth__limits">
            <thead>
              <tr>
                <th>Limitation</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Zero-drift assumption</td>
                <td>
                  Risk-neutral drift is small for monthly horizons (~0.4%) relative to vol (~20-25%).
                  Introduces modest bias at far-from-money strikes where log-distance is large.
                </td>
              </tr>
              <tr>
                <td>Coarse strike grid</td>
                <td>
                  ~10 rungs at $5k spacing yields a noisy smile at the wings. Inversion amplifies
                  any pricing errors on outer rungs.
                </td>
              </tr>
              <tr>
                <td>Non-monotone outer rungs</td>
                <td>
                  Polymarket occasionally prices a farther strike higher than a closer one (thin
                  liquidity, stale quotes). These rungs are dropped and flagged. Future versions
                  will apply isotonic regression to repair rather than discard.
                </td>
              </tr>
              <tr>
                <td>Near-expiry instability</td>
                <td>
                  T → 0 in the denominator amplifies price noise. PVOL readings in the final week
                  of a contract should be treated with caution.
                </td>
              </tr>
              <tr>
                <td>No empirical validation</td>
                <td>
                  The PVOL/DVOL spread is observable and interpretable but has not been backtested
                  against subsequent realized vol or BTC returns. Validating the gap as a predictive
                  signal requires at least 6 months of data and is future work.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

      </div >

      {/* ── Footer ── */}
      < footer className="meth__footer" >
        <PivoltLogo fontSize={12} color="#6a6a99" accentColor="#3a5a99" />
        <button className="meth__nav-back" onClick={onBack}>← Back to app</button>
      </footer >

    </div >
  );
}
