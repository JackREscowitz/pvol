import { useRef, useState, useEffect } from "react";
import { MOCK_DATA, MOCK_HISTORY, MOCK_CANDLES } from "../mockData.js";
import CandleChart from "./charts/CandleChart.jsx";
import ComparisonChart from "./charts/Comparison.jsx";
import SmileChart from "./charts/SmileChart.jsx";
import "./Landing.css";

function AnimatedBlock({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(60px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Landing({ onEnter }) {
  const gapRef   = useRef(null);
  const smileRef = useRef(null);
  const compRef  = useRef(null);
  const topRef   = useRef(null);

  const { gap, pvol, dvol, spot } = MOCK_DATA;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo  = (ref) => ref.current?.scrollIntoView({ behavior: "smooth" });
  const scrollTop = ()    => topRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="landing" ref={topRef}>

      {/* ── Nav ── */}
      <nav className={`landing__nav${scrolled ? " landing__nav--scrolled" : ""}`}>
        <span className="landing__nav-brand">PVOL</span>

        <div className="landing__nav-right">
          <button className="landing__nav-link" onClick={() => scrollTo(gapRef)}>GAP</button>
          <button className="landing__nav-link" onClick={() => scrollTo(smileRef)}>PVOL Smile</button>
          <button className="landing__nav-link" onClick={() => scrollTo(compRef)}>PVOL vs DVOL</button>

          <div className="landing__nav-divider" />

          <div className="landing__nav-btc">
            <span className="landing__nav-btc-label">BTC</span>
            <span className="landing__nav-btc-price">${spot.toLocaleString()}</span>
            <span className={`landing__nav-gap ${gap >= 0 ? "landing__nav-gap--pos" : "landing__nav-gap--neg"}`}>
              {gap >= 0 ? "+" : ""}{gap.toFixed(2)}%
            </span>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing__hero">
        <div className="landing__cloud landing__cloud--1" />
        <div className="landing__cloud landing__cloud--2" />
        <div className="landing__cloud landing__cloud--3" />

        <div className="landing__badge">
          <span className="landing__badge-dot" />
          Live · BTC Options
        </div>

        <h1 className="landing__title">PVOL</h1>

        <p className="landing__subtitle">
          Real-time implied volatility from Polymarket,
          benchmarked against Deribit's institutional DVOL index.
        </p>

        <div className="landing__stats">
          <div className="landing__stat">
            <span className="landing__stat-label">BTC</span>
            <span className="landing__stat-value">${spot.toLocaleString()}</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-label">PVOL</span>
            <span className="landing__stat-value">{pvol.toFixed(2)}%</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-label">DVOL</span>
            <span className="landing__stat-value">{dvol.toFixed(2)}%</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-label">GAP</span>
            <span className={`landing__stat-value ${gap >= 0 ? "landing__stat-value--pos" : "landing__stat-value--neg"}`}>
              {gap >= 0 ? "+" : ""}{gap.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="landing__scroll-cue" onClick={() => scrollTo(gapRef)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 11L2 5h12z"/>
          </svg>
          Scroll
        </div>
      </section>

      {/* ── Charts section ── */}
      <section className="landing__charts-section">

        {/* GAP – candlestick */}
        <AnimatedBlock delay={0}>
          <div className="landing__chart-block" ref={gapRef}>
            <div className="landing__chart-summary">
              <div>
                <div className="landing__chart-section-title">GAP · PVOL − DVOL</div>
                <div className="landing__chart-headline">Historical Divergence</div>
                <p className="landing__chart-description">
                  Each candle shows the GAP's open, high, low, and close over a 10-minute
                  window. Green candles mean the gap widened; red candles mean it narrowed.
                  Drag the brush at the bottom to zoom into any period.
                </p>
              </div>
              <div className="landing__chart-metric">
                <span className="landing__chart-metric-label">Current GAP</span>
                <span className={`landing__chart-metric-value ${gap >= 0 ? "landing__chart-metric-value--pos" : "landing__chart-metric-value--neg"}`}>
                  {gap >= 0 ? "+" : ""}{gap.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="landing__chart-canvas">
              <CandleChart data={MOCK_CANDLES} loading={false} />
            </div>
          </div>
        </AnimatedBlock>

        {/* Smile */}
        <AnimatedBlock delay={120}>
          <div className="landing__chart-block" ref={smileRef}>
            <div className="landing__chart-summary">
              <div>
                <div className="landing__chart-section-title">PVOL Smile</div>
                <div className="landing__chart-headline">Implied Vol by Strike</div>
                <p className="landing__chart-description">
                  The volatility smile shows how the crowd prices uncertainty at each
                  BTC strike price. Higher vol at the wings reveals tail-risk sentiment
                  in the prediction market.
                </p>
              </div>
              <div className="landing__chart-metric">
                <span className="landing__chart-metric-label">PVOL Index</span>
                <span className="landing__chart-metric-value landing__chart-metric-value--neu">
                  {pvol.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="landing__chart-canvas">
              <SmileChart data={MOCK_DATA} loading={false} />
            </div>
          </div>
        </AnimatedBlock>

        {/* Comparison */}
        <AnimatedBlock delay={240}>
          <div className="landing__chart-block" ref={compRef}>
            <div className="landing__chart-summary">
              <div>
                <div className="landing__chart-section-title">PVOL vs DVOL</div>
                <div className="landing__chart-headline">Index Comparison Over Time</div>
                <p className="landing__chart-description">
                  Side-by-side view of Polymarket and Deribit volatility indices.
                  Spot when the crowd leads or lags institutional pricing and identify
                  regime shifts in real time. Use the brush to zoom.
                </p>
              </div>
              <div className="landing__chart-metric">
                <span className="landing__chart-metric-label">DVOL Index</span>
                <span className="landing__chart-metric-value landing__chart-metric-value--neu">
                  {dvol.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="landing__chart-canvas">
              <ComparisonChart data={MOCK_DATA} loading={false} history={MOCK_HISTORY} showBrush />
            </div>
          </div>
        </AnimatedBlock>

      </section>

      <footer className="landing__footer">
        <span>PVOL · YHack 2026</span>
        <button className="landing__back-top" onClick={scrollTop} title="Back to top">↑</button>
      </footer>

    </div>
  );
}
