import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart,
  ZAxis,
} from "recharts";
import "./SmileChart.css";

function SmileTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="schart-tooltip">
      <p className="schart-tooltip__strike">Strike &nbsp;${d?.strike?.toLocaleString()}</p>
      <p className="schart-tooltip__pvol">PVOL &nbsp;{d?.pvol?.toFixed(2)}%</p>
      <p className="schart-tooltip__prob">Touch prob &nbsp;{(d?.touch_prob * 100)?.toFixed(1)}%</p>
    </div>
  );
}

export default function SmileChart({ data, loading }) {
  const smile = data?.smile ?? [];
  const spot  = data?.spot  ?? null;

  if (loading && smile.length === 0) {
    return <div className="schart-empty"><span className="gchart-pulse" />Loading smile…</div>;
  }

  if (smile.length === 0) {
    return <div className="schart-empty">No smile data yet</div>;
  }

  return (
    <div className="schart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />

          {spot && (
            <ReferenceLine
              x={spot}
              stroke="#4488ff"
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{ value: "SPOT", position: "top", fill: "#4488ff", fontSize: 10 }}
            />
          )}

          <XAxis
            dataKey="strike"
            type="number"
            domain={["auto", "auto"]}
            stroke="#1a1a2e"
            tick={{ fill: "#3a3a5a", fontSize: 10 }}
            tickLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            name="Strike"
          />
          <YAxis
            dataKey="pvol"
            type="number"
            domain={["auto", "auto"]}
            stroke="#1a1a2e"
            tick={{ fill: "#3a3a5a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            width={44}
            name="PVOL"
          />
          <ZAxis range={[40, 40]} />

          <Tooltip content={<SmileTooltip />} cursor={{ stroke: "#2a2a4a" }} />

          <Scatter
            data={smile}
            fill="#4488ff"
            line={{ stroke: "#4488ff", strokeWidth: 2 }}
            lineType="joint"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
