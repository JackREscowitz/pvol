import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import "./CandleChart.css";

/**
 * Professional candlestick chart — TradingView lightweight-charts.
 *
 * @param {Array}    candleData      - OHLC: [{ time, open, high, low, close }]
 * @param {Array}    [lineData]      - Overlay line: [{ time, value }]
 * @param {string}   [lineColor]     - Line color (default amber)
 * @param {Function} [priceFormatter]- Y-axis + tooltip value formatter
 * @param {Object}   [scaleMargins]  - { top, bottom } 0–1
 * @param {boolean}  [independentLine] - When true, line uses its own hidden price
 *                                       scale so it fills the same vertical space as
 *                                       the candles and visually weaves through them.
 */
export default function CandleChart({
  candleData,
  lineData,
  lineColor       = "#eab308",
  priceFormatter,
  scaleMargins,
  independentLine = false,
}) {
  const wrapRef  = useRef(null);
  const chartRef = useRef(null);
  const ttRef    = useRef(null);

  useEffect(() => {
    const el = chartRef.current;
    if (!el || !candleData?.length) return;

    const margins = scaleMargins ?? { top: 0.08, bottom: 0.08 };

    // ── Create chart ────────────────────────────────────────────────────
    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor:  "#666688",
        fontSize:   11,
      },
      grid: {
        vertLines: { color: "#0d0d14" },
        horzLines: { color: "#0d0d14" },
      },
      crosshair: {
        mode: 1, // Magnet — snaps crosshair to nearest candle
        vertLine: {
          color:                "#3a3a5a",
          width:                1,
          style:                2, // dashed
          labelBackgroundColor: "#0d0d1a",
        },
        horzLine: {
          color:                "#3a3a5a",
          width:                1,
          style:                2,
          labelBackgroundColor: "#0d0d1a",
        },
      },
      rightPriceScale: {
        borderColor:  "#1a1a28",
        scaleMargins: margins,
      },
      timeScale: {
        borderColor:    "#1a1a28",
        timeVisible:    true,
        secondsVisible: false,
        fixLeftEdge:    true,
        fixRightEdge:   true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale:  { mouseWheel: true, pinch: true },
      width:  el.clientWidth  || 400,
      height: el.clientHeight || 280,
    });

    if (priceFormatter) {
      chart.applyOptions({ localization: { priceFormatter } });
    }

    // ── Candlestick series — TradingView default palette ────────────────
    const candleSeries = chart.addCandlestickSeries({
      upColor:          "#26a69a",
      downColor:        "#ef5350",
      borderUpColor:    "#26a69a",
      borderDownColor:  "#ef5350",
      wickUpColor:      "#26a69a",
      wickDownColor:    "#ef5350",
      priceLineVisible: false,
    });
    candleSeries.setData(candleData);

    // ── Optional line overlay ───────────────────────────────────────────
    if (lineData?.length) {
      const ls = chart.addLineSeries({
        color:                  lineColor,
        lineWidth:              2,
        lineStyle:              0,
        priceLineVisible:       false,
        lastValueVisible:       !independentLine,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius:  4,
        // When independentLine, put on a hidden left scale so the line
        // maps its own value range across the full chart height, making
        // it visually weave through the candle bodies.
        priceScaleId: independentLine ? "left" : "right",
      });
      ls.setData(lineData);

      if (independentLine) {
        chart.priceScale("left").applyOptions({
          visible:      false, // hide the separate left axis
          scaleMargins: margins,
        });
      }
    }

    chart.timeScale().fitContent();

    // ── Floating OHLC tooltip (matches reference image) ─────────────────
    const tt = ttRef.current;
    let moveHandler = null;

    if (tt) {
      moveHandler = param => {
        if (
          !param.time    || !param.point ||
          param.point.x  <  0 || param.point.x > el.clientWidth ||
          param.point.y  <  0 || param.point.y > el.clientHeight
        ) {
          tt.style.display = "none";
          return;
        }

        const d = param.seriesData.get(candleSeries);
        if (!d) { tt.style.display = "none"; return; }

        const fmt  = priceFormatter ?? (v => v.toFixed(2));
        const bull = d.close >= d.open;
        const clr  = bull ? "#26a69a" : "#ef5350";

        tt.innerHTML = `
          <div class="ct-row">
            <span class="ct-k">O</span>
            <span class="ct-v">${fmt(d.open)}</span>
          </div>
          <div class="ct-row">
            <span class="ct-k">C</span>
            <span class="ct-v" style="color:${clr}">${fmt(d.close)}</span>
          </div>
          <div class="ct-row">
            <span class="ct-k">H</span>
            <span class="ct-v">${fmt(d.high)}</span>
          </div>
          <div class="ct-row">
            <span class="ct-k">L</span>
            <span class="ct-v">${fmt(d.low)}</span>
          </div>
        `;
        tt.style.display = "block";

        const W    = tt.offsetWidth  || 120;
        const H    = tt.offsetHeight || 88;
        const left = param.point.x + 20 + W > el.clientWidth
          ? param.point.x - W - 12
          : param.point.x + 20;
        const top  = Math.max(8, Math.min(param.point.y - H / 2, el.clientHeight - H - 8));
        tt.style.left = `${left}px`;
        tt.style.top  = `${top}px`;
      };

      chart.subscribeCrosshairMove(moveHandler);
    }

    // ── Resize observer ─────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (!el) return;
      chart.applyOptions({
        width:  el.clientWidth  || 400,
        height: el.clientHeight || 280,
      });
    });
    ro.observe(el);

    return () => {
      if (moveHandler) chart.unsubscribeCrosshairMove(moveHandler);
      ro.disconnect();
      chart.remove();
      if (tt) tt.style.display = "none";
    };
  }, [candleData, lineData, lineColor, priceFormatter, scaleMargins, independentLine]);

  return (
    <div ref={wrapRef} className="candle-chart__wrap">
      <div ref={chartRef} className="candle-chart__inner" />
      <div ref={ttRef}    className="candle-chart__tooltip" />
    </div>
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
