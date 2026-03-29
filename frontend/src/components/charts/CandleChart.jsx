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
        mode: 1,
        vertLine: {
          color:                "#3a3a5a",
          width:                1,
          style:                2,
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

    if (lineData?.length) {
      const ls = chart.addLineSeries({
        color:                  lineColor,
        lineWidth:              2,
        lineStyle:              0,
        priceLineVisible:       false,
        lastValueVisible:       !independentLine,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius:  4,
        priceScaleId: independentLine ? "left" : "right",
      });
      ls.setData(lineData);

      if (independentLine) {
        chart.priceScale("left").applyOptions({
          visible:      false,
          scaleMargins: margins,
        });
      }
    }

    chart.timeScale().fitContent();

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
  );
}
