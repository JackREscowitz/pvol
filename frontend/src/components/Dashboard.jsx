import { useState, useRef } from "react";
import { useDashboardData } from "../hooks/useDashboardData.js";
import { useBtcPrice } from "../hooks/useBtcPrice.js";
import MetricCard from "./MetricCard.jsx";
import GapChart from "./charts/GapChart.jsx";
import ComparisonChart from "./charts/Comparison.jsx";
import SmileChart from "./charts/SmileChart.jsx";
import { MOCK_DATA, MOCK_HISTORY } from "../mockData.js";
import "./Dashboard.css";

const USE_MOCK = true;

const CHARTS = [
  { id: "gap-chart",        title: "GAP · PVOL − DVOL", subtitle: "Historical divergence",    primary: true },
  { id: "smile-chart",      title: "PVOL Smile",         subtitle: "Implied vol by strike",    primary: false },
  { id: "comparison-chart", title: "PVOL vs DVOL",       subtitle: "Index comparison over time", primary: false },
];

export default function Dashboard({ onBack }) {
  const live = useDashboardData();
  const { data, loading, error, lastUpdated, refresh } = USE_MOCK
    ? { data: MOCK_DATA, loading: false, error: null, lastUpdated: new Date(), refresh: () => {} }
    : live;
  const btcPrice = useBtcPrice();

  const [showAll, setShowAll]     = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX               = useRef(null);

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    setActiveIdx(i => delta < 0
      ? Math.min(i + 1, CHARTS.length - 1)
      : Math.max(i - 1, 0)
    );
  }

  const pvol = data?.pvol ?? null;
  const dvol = data?.dvol ?? null;
  const gap  = data?.gap  ?? null;

  const gapHighlight =
    gap === null ? "neutral" :
    gap > 0      ? "positive" :
    gap < 0      ? "negative" : "neutral";

  const gapDescription =
    gap === null ? "Awaiting data" :
    gap > 0 ? "Crowd pricing more vol than institutions" :
    gap < 0 ? "Crowd calmer than institutions" :
              "Crowd and institutions aligned";

  return (
    <div className="terminal">

      {/* ── Top bar ── */}
      <header className="terminal__topbar">
        <div className="terminal__brand">
          {onBack && (
            <button className="terminal__back" onClick={onBack} title="Back to landing">←</button>
          )}
          <span className="terminal__brand-name">PVOL</span>
          <span className="terminal__brand-sub">Polymarket Implied Volatility</span>
        </div>

        <div className="terminal__ticker">
          {/* Currency selector */}
          <div className="currency-selector">
            <span className="currency-selector__label">Currency</span>
            <div className="currency-selector__pill">
              <span className="currency-selector__icon">
                <svg viewBox="0 0 32 32" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="16" fill="#F7931A"/>
                  <path d="M22.5 14.1c.3-2.1-1.3-3.2-3.5-3.9l.7-2.9-1.7-.4-.7 2.8-.5-.1-.5-.1.7-2.8-1.7-.4-.7 2.9-1.2-.3-2.3-.6-.4 1.8s1.3.3 1.2.3c.7.2.8.6.8.9l-.9 3.7c.1 0 .2 0 .3.1h-.3l-1.3 5.2c-.1.3-.4.7-.9.5.0 0-1.2-.3-1.2-.3l-.8 2 2.2.5.5.1-.7 2.9 1.7.4.7-2.9.5.1.5.1-.7 2.8 1.7.4.7-2.9c2.9.5 5 .3 5.9-2.3.7-2-.0-3.2-1.5-3.9 1.1-.2 1.9-1 2.1-2.4zm-3.8 5.3c-.5 2-3.9 1-5 .7l.9-3.6c1.1.3 4.6.8 4.1 2.9zm.5-5.3c-.5 1.8-3.3 1-4.3.7l.8-3.2c1 .2 4.1.7 3.5 2.5z" fill="#fff"/>
                </svg>
              </span>
              <span className="currency-selector__name">BTC</span>
              <span className="currency-selector__chevron">&#8964;</span>
            </div>
            {(data?.spot ?? btcPrice) && (
              <span className="currency-selector__price">
                ${(data?.spot ?? btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {dvol && (
            <div className="ticker-item">
              <span className="ticker-item__label">DVOL</span>
              <span className="ticker-item__value">{dvol.toFixed(2)}</span>
            </div>
          )}
          {data?.days_remaining != null && (
            <div className={`ticker-item ${data.near_expiry ? "ticker-item--warn" : ""}`}>
              <span className="ticker-item__label">EXPIRY</span>
              <span className="ticker-item__value">{data.days_remaining}d</span>
            </div>
          )}
        </div>

        <div className="terminal__actions">
          {data?.data_quality_flag && (
            <span className="terminal__dq-flag">
              ⚑ {data.dropped_rungs?.length} rungs dropped
            </span>
          )}

          {/* Layout toggle */}
          <button
            className={`layout-toggle ${showAll ? "layout-toggle--active" : ""}`}
            onClick={() => setShowAll(v => !v)}
            title={showAll ? "Single view" : "All charts"}
          >
            {showAll ? (
              /* single-view icon: one rectangle */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="3" width="14" height="10" rx="1.5"/>
              </svg>
            ) : (
              /* grid icon: three rows */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="3.5" rx="1"/>
                <rect x="1" y="6.25" width="14" height="3.5" rx="1"/>
                <rect x="1" y="10.5" width="14" height="3.5" rx="1"/>
              </svg>
            )}
            {showAll ? "Single" : "All charts"}
          </button>

          <button className="terminal__refresh" onClick={refresh} disabled={loading}>
            {loading ? "•••" : "↻ Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="terminal__error">{error}</div>}

      {/* ── Main layout ── */}
      <div className="terminal__body">

        {/* Left — charts column */}
        <div className="terminal__charts">

          {showAll ? (
            /* ── All-charts view ── */
            <>
              {CHARTS.map(c => (
                <div key={c.id} className={`chart-panel ${c.primary ? "chart-panel--primary" : ""}`}>
                  <div className="chart-panel__header">
                    <span className="chart-panel__title">{c.title}</span>
                    <span className="chart-panel__subtitle">{c.subtitle}</span>
                  </div>
                  <div className={`chart-panel__canvas${c.primary ? "" : " chart-panel__canvas--sm"}`}>
                    {c.id === "gap-chart"        && <GapChart        data={data} loading={loading} history={USE_MOCK ? MOCK_HISTORY : undefined} />}
                    {c.id === "comparison-chart" && <ComparisonChart data={data} loading={loading} history={USE_MOCK ? MOCK_HISTORY : undefined} />}
                    {c.id === "smile-chart"      && <SmileChart      data={data} loading={loading} />}
                  </div>
                </div>
              ))}
            </>
          ) : (
            /* ── Single / carousel view ── */
            <div
              className="carousel"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="chart-panel chart-panel--fill">
                <div className="chart-panel__header">
                  <span className="chart-panel__title">{CHARTS[activeIdx].title}</span>
                  <span className="chart-panel__subtitle">{CHARTS[activeIdx].subtitle}</span>
                </div>
                <div className="chart-panel__canvas">
                  {CHARTS[activeIdx].id === "gap-chart"        && <GapChart        data={data} loading={loading} history={USE_MOCK ? MOCK_HISTORY : undefined} />}
                  {CHARTS[activeIdx].id === "comparison-chart" && <ComparisonChart data={data} loading={loading} history={USE_MOCK ? MOCK_HISTORY : undefined} />}
                  {CHARTS[activeIdx].id === "smile-chart"      && <SmileChart      data={data} loading={loading} />}
                </div>
              </div>

              {/* Chart name indicators */}
              <div className="carousel__indicators">
                {CHARTS.map((c, i) => (
                  <button
                    key={c.id}
                    className={`carousel__indicator ${i === activeIdx ? "carousel__indicator--active" : ""}`}
                    onClick={() => setActiveIdx(i)}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right — metrics sidebar */}
        <aside className="terminal__sidebar">

          <MetricCard
            label="GAP"
            sublabel="PVOL − DVOL"
            value={gap}
            unit="%"
            description={gapDescription}
            highlight={gapHighlight}
            loading={loading}
            onClick={showAll ? undefined : () => { setShowAll(false); setActiveIdx(0); }}
          />

          <MetricCard
            label="PVOL"
            sublabel="Polymarket Index"
            value={pvol}
            unit="%"
            description="Prob-mass weighted avg across all strikes"
            highlight="neutral"
            loading={loading}
            onClick={showAll ? undefined : () => { setShowAll(false); setActiveIdx(1); }}
          />

          <MetricCard
            label="DVOL"
            sublabel="Deribit Index"
            value={dvol}
            unit="%"
            description="30-day implied vol from institutional options"
            highlight="neutral"
            loading={loading}
            onClick={showAll ? undefined : () => { setShowAll(false); setActiveIdx(2); }}
          />

          {lastUpdated && (
            <p className="terminal__updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </aside>

      </div>
    </div>
  );
}
