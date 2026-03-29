import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush,
} from "recharts";
import { useChartHistory } from "../../hooks/useChartHistory.js";
import "./ComparisonChart.css";

function CompTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="cchart-tooltip">
      <p className="cchart-tooltip__time">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="cchart-tooltip__row" style={{ color: p.color }}>
          {p.dataKey.toUpperCase()} &nbsp;{p.value?.toFixed(2)}%
        </p>
      ))}
      {payload.length === 2 && (
        <p className="cchart-tooltip__gap">
          GAP &nbsp;
          <span style={{ color: payload[0].value - payload[1].value >= 0 ? "#22c55e" : "#ef4444" }}>
            {(payload[0].value - payload[1].value) >= 0 ? "+" : ""}
            {(payload[0].value - payload[1].value)?.toFixed(2)}%
          </span>
        </p>
      )}
    </div>
  );
}

function CompLegend({ payload }) {
  return (
    <div className="cchart-legend">
      {payload?.map(p => (
        <span key={p.value} className="cchart-legend__item">
          <span className="cchart-legend__dot" style={{ background: p.color }} />
          {p.value.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export default function ComparisonChart({ data, loading, history: historyProp, showBrush = false }) {
  const liveHistory = useChartHistory(historyProp ? null : data);
  const history = historyProp ?? liveHistory;

  if (loading && history.length === 0) {
    return <div className="cchart-empty"><span className="gchart-pulse" />Loading…</div>;
  }

  if (history.length === 0) {
    return <div className="cchart-empty">Waiting for first data point…</div>;
  }

  return (
    <div className="cchart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 12, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />

          <XAxis
            dataKey="time"
            stroke="#1a1a2e"
            tick={{ fill: "#3a3a5a", fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#1a1a2e"
            tick={{ fill: "#3a3a5a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            width={44}
            domain={["auto", "auto"]}
          />

          <Tooltip content={<CompTooltip />} cursor={{ stroke: "#2a2a4a", strokeWidth: 1 }} />
          <Legend content={<CompLegend />} />

          <Line
            type="monotone"
            dataKey="pvol"
            stroke="#4488ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#4488ff", strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="dvol"
            stroke="#aa44ff"
            strokeWidth={2}
            dot={false}
            strokeDasharray="6 3"
            activeDot={{ r: 4, fill: "#aa44ff", strokeWidth: 0 }}
          />
          {showBrush && (
            <Brush dataKey="time" height={26} stroke="#1a1a2e" fill="#0b0b10" travellerWidth={6} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
