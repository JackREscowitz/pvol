import { useState, useEffect, useRef } from "react";
import { snapshot, history } from "../data/index.js";
import GapChart from "./charts/GapChart.jsx";
import ComparisonChart from "./charts/Comparison.jsx";
import PvolHistory from "./charts/PvolHistory.jsx";
import PivoltLogo from "./PivoltLogo.jsx";
import "./Landing.css";

function FadeIn({ children, delay = 0 }) {
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
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(48px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const SECTIONS = [
  {
    id: "gap",
    tag: "GAP · PVOL − DVOL",
    headline: "Historical Divergence",
    body: "The spread between what Polymarket crowds and Deribit institutions priced into BTC volatility. Each candle captures whether the gap grew or shrank over a ~3-day window.",
    chart: <GapChart history={history} />,
  },
  {
    id: "pvd",
    tag: "PVOL vs DVOL",
    headline: "Index Comparison",
    body: "Both indices as continuous lines on a shared scale. Where the lines converge, crowd and institutions agreed. Where they diverge, one was pricing in significantly more uncertainty than the other.",
    chart: <ComparisonChart history={history} />,
  },
  {
    id: "pvol",
    tag: "PVOL History",
    headline: "Polymarket Implied Vol",
    body: "PVOL across all 8 monthly BTC contracts. The indigo line is a 9-period EMA — it tracks the underlying trend while smoothing out day-to-day noise in the crowd's vol pricing.",
    chart: <PvolHistory history={history} />,
  },
];

export default function Landing({ onEnter, onMethodology }) {
  const topRef    = useRef(null);
  const sectionRefs = useRef({});
  const [scrolled, setScrolled] = useState(false);

  const { gap, pvol, dvol, spot } = snapshot;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = id => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="landing" ref={topRef}>

      {/* ── Nav ── */}
      <nav className={`l-nav${scrolled ? " l-nav--scrolled" : ""}`}>
        <PivoltLogo fontSize={15} />

        <div className="l-nav__center">
          <span className="l-nav__stat">BTC <strong>${spot.toLocaleString()}</strong></span>
          <span className="l-nav__divider" />
          <span className="l-nav__stat">PVOL <strong>{pvol.toFixed(2)}%</strong></span>
          <span className="l-nav__divider" />
          <span className="l-nav__stat">DVOL <strong>{dvol.toFixed(2)}%</strong></span>
          <span className="l-nav__divider" />
          <span className={`l-nav__gap${gap >= 0 ? " l-nav__gap--pos" : " l-nav__gap--neg"}`}>
            GAP {gap >= 0 ? "+" : ""}{gap.toFixed(2)}%
          </span>
        </div>

        <div className="l-nav__right">
          <button className="l-nav__link" onClick={() => scrollTo("gap")}>GAP</button>
          <button className="l-nav__link" onClick={() => scrollTo("pvd")}>PVOL vs DVOL</button>
          <button className="l-nav__link" onClick={() => scrollTo("pvol")}>PVOL</button>
          <button className="l-nav__link" onClick={onMethodology}>Methodology</button>
          <button className="l-nav__cta" onClick={onEnter}>Dashboard →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="l-hero">
        <div className="l-hero__badge">Jul 2025 – Feb 2026 · BTC Monthly Contracts</div>

        <h1 className="l-hero__title">
          <svg className="l-hero__bolt" viewBox="0 0 12 20" fill="none" aria-hidden="true">
            <path d="M 8 0 L 0 12 L 5 12 L 4 20 L 12 8 L 7 8 Z" fill="#4488ff" />
          </svg>
          Pivolt
        </h1>
        <p className="l-hero__sub">
          Implied volatility extracted from Polymarket prediction markets,<br />
          benchmarked against Deribit's institutional DVOL index.
        </p>

        <div className="l-hero__stats">
          <div className="l-hero__stat">
            <span className="l-hero__stat-label">BTC</span>
            <span className="l-hero__stat-value">${spot.toLocaleString()}</span>
          </div>
          <div className="l-hero__divider" />
          <div className="l-hero__stat">
            <span className="l-hero__stat-label">PVOL</span>
            <span className="l-hero__stat-value">{pvol.toFixed(2)}%</span>
          </div>
          <div className="l-hero__divider" />
          <div className="l-hero__stat">
            <span className="l-hero__stat-label">DVOL</span>
            <span className="l-hero__stat-value">{dvol.toFixed(2)}%</span>
          </div>
          <div className="l-hero__divider" />
          <div className="l-hero__stat">
            <span className="l-hero__stat-label">GAP</span>
            <span className={`l-hero__stat-value${gap >= 0 ? " l-hero__stat-value--pos" : " l-hero__stat-value--neg"}`}>
              {gap >= 0 ? "+" : ""}{gap.toFixed(2)}%
            </span>
          </div>
        </div>

        <button className="l-hero__btn" onClick={onEnter}>
          Open Dashboard
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      {/* ── Chart sections ── */}
      <section className="l-charts">
        {SECTIONS.map((s, i) => (
          <FadeIn key={s.id} delay={i * 80}>
            <div
              className="l-block"
              ref={el => { sectionRefs.current[s.id] = el; }}
            >
              <div className="l-block__info">
                <span className="l-block__tag">{s.tag}</span>
                <h2 className="l-block__headline">{s.headline}</h2>
                <p className="l-block__body">{s.body}</p>
              </div>
              <div className="l-block__chart">{s.chart}</div>
            </div>
          </FadeIn>
        ))}
      </section>

      <footer className="l-footer">
        <PivoltLogo fontSize={12} color="#6a6a99" accentColor="#3a5a99" />
        <button className="l-footer__link" onClick={onMethodology}>Methodology</button>
        <button className="l-footer__top" onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })}>↑</button>
      </footer>

    </div>
  );
}
