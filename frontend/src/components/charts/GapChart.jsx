import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { useChartHistory } from "../../hooks/useChartHistory.js";
import "./GapChart.css";

function GapTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="gchart-tooltip">
      <p className="gchart-tooltip__time">{label}</p>
      <p className={`gchart-tooltip__val ${val >= 0 ? "pos" : "neg"}`}>
        GAP &nbsp;{val >= 0 ? "+" : ""}{val?.toFixed(2)}%
      </p>
    </div>
  );
}

export default function GapChart({ data, loading }) {
  const history = useChartHistory(data);

  if (loading && history.length === 0) {
    return <div className="gchart-empty"><span className="gchart-pulse" />Loading data…</div>;
  }

  if (history.length === 0) {
    return <div className="gchart-empty">Waiting for first data point…</div>;
  }

  // pick fill color by whether current gap is positive or negative
  const currentGap = history[history.length - 1]?.gap ?? 0;
  const strokeColor = currentGap >= 0 ? "#22c55e" : "#ef4444";
  const gradId      = currentGap >= 0 ? "gapGreenGrad" : "gapRedGrad";

  return (
    <div className="gchart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 12, right: 24, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="gapGreenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gapRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
          <ReferenceLine y={0} stroke="#3a3a5a" strokeDasharray="6 3" label={{ value: "0", fill: "#3a3a5a", fontSize: 10 }} />

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
            tickFormatter={v => `${v > 0 ? "+" : ""}${v}%`}
            width={44}
          />

          <Tooltip content={<GapTooltip />} cursor={{ stroke: "#2a2a4a", strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="gap"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
