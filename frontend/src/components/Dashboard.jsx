import { useState } from "react";
import { snapshot, history } from "../data/index.js";
import MetricCard from "./MetricCard.jsx";
import GapChart from "./charts/GapChart.jsx";
import ComparisonChart from "./charts/Comparison.jsx";
import PvolHistory from "./charts/PvolHistory.jsx";
import "./Dashboard.css";

const TABS = [
  { id: "gap",      label: "GAP",          subtitle: "PVOL − DVOL divergence" },
  { id: "pvol-dvol", label: "PVOL vs DVOL", subtitle: "Index comparison over time" },
  { id: "pvol",     label: "PVOL History", subtitle: "Polymarket implied vol" },
];

export default function Dashboard({ onBack, onMethodology }) {
  const [activeTab, setActiveTab] = useState("gap");

  const { pvol, dvol, gap, spot, date } = snapshot;

  const gapHighlight   = gap > 0 ? "positive" : gap < 0 ? "negative" : "neutral";
  const gapDescription = gap > 0
    ? "Crowd pricing more vol than institutions"
    : gap < 0
    ? "Crowd calmer than institutions"
    : "Aligned";

  return (
    <div className="dash">

      {/* ── Top bar ── */}
      <header className="dash__topbar">
        <div className="dash__brand">
          {onBack && (
            <button className="dash__back" onClick={onBack}>←</button>
          )}
          <span className="dash__brand-name">PVOL</span>
          <span className="dash__brand-sub">Polymarket Implied Volatility</span>
        </div>

        <div className="dash__meta">
          {spot && (
            <span className="dash__spot">
              BTC <strong>${spot.toLocaleString()}</strong>
            </span>
          )}
          <span className="dash__range">Data: Jul 2025 – Feb 2026</span>
          {onMethodology && (
            <button className="dash__methodology" onClick={onMethodology}>Methodology</button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="dash__body">

        {/* Left: chart + tabs */}
        <div className="dash__main">
          <div className="dash__chart">
            {activeTab === "gap"       && <GapChart        history={history} />}
            {activeTab === "pvol-dvol" && <ComparisonChart history={history} />}
            {activeTab === "pvol"      && <PvolHistory     history={history} />}
          </div>

          <div className="dash__tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`dash__tab${activeTab === t.id ? " dash__tab--active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="dash__tab-label">{t.label}</span>
                <span className="dash__tab-sub">{t.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: sidebar */}
        <aside className="dash__sidebar">
          <MetricCard
            label="GAP"
            sublabel="PVOL − DVOL"
            value={gap}
            unit="%"
            description={gapDescription}
            highlight={gapHighlight}
            onClick={() => setActiveTab("gap")}
          />
          <MetricCard
            label="PVOL"
            sublabel="Polymarket Index"
            value={pvol}
            unit="%"
            description="Prob-weighted avg across all strikes"
            highlight="neutral"
            onClick={() => setActiveTab("pvol")}
          />
          <MetricCard
            label="DVOL"
            sublabel="Deribit Index"
            value={dvol}
            unit="%"
            description="30-day IV from institutional options"
            highlight="neutral"
            onClick={() => setActiveTab("pvol-dvol")}
          />
          <p className="dash__date">Last entry: {date}</p>
        </aside>

      </div>
    </div>
  );
}
