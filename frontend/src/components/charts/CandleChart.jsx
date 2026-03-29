import {
  ComposedChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Brush,
} from "recharts";

function CandleShape({ x, y, width, height, payload }) {
  if (!payload || height <= 0) return null;
  const { open, close, high, low } = payload;
  const range = high - low;
  if (range === 0) return null;

  const isGreen = close >= open;
  const color   = isGreen ? "#22c55e" : "#ef4444";

  // y = pixel of `high`, y+height = pixel of `low`
  const toY = (v) => y + height * (high - v) / range;

  const yOpen  = toY(open);
  const yClose = toY(close);
  const bodyTop = Math.min(yOpen, yClose);
  const bodyH   = Math.max(Math.abs(yClose - yOpen), 2);
  const cx      = x + width / 2;
  const bw      = Math.max(width - 5, 3);
  const bx      = x + (width - bw) / 2;

  return (
    <g>
      {/* Full wick */}
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={color} strokeWidth={1.5} />
      {/* Body */}
      <rect x={bx} y={bodyTop} width={bw} height={bodyH} fill={color} rx={1} />
    </g>
  );
}

function CandleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isGreen = d.close >= d.open;
  const color   = isGreen ? "#22c55e" : "#ef4444";
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ color: "#64748b", margin: "0 0 6px" }}>{label}</p>
      <p style={{ margin: "2px 0", color: "#94a3b8" }}>O <span style={{ color: "#fff" }}>{d.open?.toFixed(2)}%</span></p>
      <p style={{ margin: "2px 0", color: "#94a3b8" }}>H <span style={{ color: "#22c55e" }}>{d.high?.toFixed(2)}%</span></p>
      <p style={{ margin: "2px 0", color: "#94a3b8" }}>L <span style={{ color: "#ef4444" }}>{d.low?.toFixed(2)}%</span></p>
      <p style={{ margin: "2px 0", color: "#94a3b8" }}>C <span style={{ color }}>{d.close?.toFixed(2)}%</span></p>
    </div>
  );
}

export default function CandleChart({ data, loading }) {
  if (loading || !data?.length) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: 13 }}>Loading…</div>;
  }

  // Add stacked base/range so Recharts positions bars at [low, high]
  const chartData = data.map(d => ({
    ...d,
    _base:  d.low,
    _range: +(d.high - d.low).toFixed(3),
  }));

  const allLows  = data.map(d => d.low);
  const allHighs = data.map(d => d.high);
  const minY = Math.min(...allLows)  - .5;
  const maxY = Math.max(...allHighs) + .5;

  const defaultStart = Math.max(0, chartData.length - 20);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" strokeOpacity={.7} vertical={false} />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="6 3" />

        <XAxis
          dataKey="time"
          tick={{ fill: "#374151", fontSize: 10 }}
          tickLine={false}
          stroke="#e2e8f0"
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minY, maxY]}
          tick={{ fill: "#374151", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
          width={48}
        />

        <Tooltip content={<CandleTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />

        {/* Invisible base positions each bar at `low` */}
        <Bar dataKey="_base" stackId="c" fill="transparent" stroke="none" isAnimationActive={false} legendType="none" />
        {/* Visible candle bar from low to high */}
        <Bar dataKey="_range" stackId="c" shape={<CandleShape />} isAnimationActive={false} />

        <Brush
          dataKey="time"
          height={26}
          stroke="#e2e8f0"
          fill="#f8fafc"
          travellerWidth={6}
          startIndex={defaultStart}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
