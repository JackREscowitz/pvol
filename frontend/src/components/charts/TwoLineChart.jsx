import { useEffect, useRef } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import "./CandleChart.css";

/**
 * Two-line chart. Each line is passed as segmented data from toSegmentedLine():
 *   { solid: Array<Array<{time,value}>>, dotted: Array<Array<{time,value}>> }
 *
 * Solid segments are rendered as continuous lines; dotted segments bridge
 * the cross-month gaps where no real data exists.
 */
export default function TwoLineChart({
  line1Segs,
  line2Segs,
  line1Color = "#4488ff",
  line2Color = "#eab308",
  line1Label = "A",
  line2Label = "B",
  priceFormatter,
}) {
  const chartRef = useRef(null);
  const ttRef    = useRef(null);

  useEffect(() => {
    const el = chartRef.current;
    if (!el || !line1Segs?.solid?.length) return;

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
        vertLine: { color: "#3a3a5a", width: 1, style: 2, labelBackgroundColor: "#0d0d1a" },
        horzLine: { color: "#3a3a5a", width: 1, style: 2, labelBackgroundColor: "#0d0d1a" },
      },
      rightPriceScale: {
        borderColor:  "#1a1a28",
        scaleMargins: { top: 0.1, bottom: 0.1 },
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

    const solidOpts = (color) => ({
      color,
      lineWidth:              2,
      lineStyle:              0,
      priceLineVisible:       false,
      lastValueVisible:       true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  4,
    });

    const dottedOpts = (color) => ({
      color,
      lineWidth:              1,
      lineStyle:              1, // dotted
      priceLineVisible:       false,
      lastValueVisible:       false,
      crosshairMarkerVisible: false,
    });

    // Build all series; track solid ones for tooltip lookup
    const line1SolidRefs = [];
    const line2SolidRefs = [];

    line1Segs.solid.forEach((seg, i) => {
      const isLast = i === line1Segs.solid.length - 1;
      const s = chart.addSeries(LineSeries, { ...solidOpts(line1Color), lastValueVisible: isLast });
      s.setData(seg);
      line1SolidRefs.push(s);
    });
    for (const seg of (line1Segs.dotted ?? [])) {
      const s = chart.addSeries(LineSeries, dottedOpts(line1Color));
      s.setData(seg);
    }

    (line2Segs?.solid ?? []).forEach((seg, i) => {
      const isLast = i === line2Segs.solid.length - 1;
      const s = chart.addSeries(LineSeries, { ...solidOpts(line2Color), lastValueVisible: isLast });
      s.setData(seg);
      line2SolidRefs.push(s);
    });
    for (const seg of (line2Segs?.dotted ?? [])) {
      const s = chart.addSeries(LineSeries, dottedOpts(line2Color));
      s.setData(seg);
    }

    chart.timeScale().fitContent();

    const tt = ttRef.current;
    let moveHandler = null;

    if (tt) {
      moveHandler = param => {
        if (
          !param.time   || !param.point ||
          param.point.x  < 0 || param.point.x > el.clientWidth ||
          param.point.y  < 0 || param.point.y > el.clientHeight
        ) {
          tt.style.display = "none";
          return;
        }

        const v1 = line1SolidRefs.reduce((acc, s) => acc ?? param.seriesData.get(s)?.value, null);
        const v2 = line2SolidRefs.reduce((acc, s) => acc ?? param.seriesData.get(s)?.value, null);
        if (v1 == null && v2 == null) { tt.style.display = "none"; return; }

        const fmt = priceFormatter ?? (v => v.toFixed(2));
        tt.innerHTML = `
          <div class="ct-row">
            <span class="ct-k" style="color:${line1Color}">${line1Label}</span>
            <span class="ct-v">${v1 != null ? fmt(v1) : "—"}</span>
          </div>
          <div class="ct-row">
            <span class="ct-k" style="color:${line2Color}">${line2Label}</span>
            <span class="ct-v">${v2 != null ? fmt(v2) : "—"}</span>
          </div>
        `;
        tt.style.display = "block";

        const W    = tt.offsetWidth  || 100;
        const H    = tt.offsetHeight || 52;
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
      chart.applyOptions({ width: el.clientWidth || 400, height: el.clientHeight || 280 });
    });
    ro.observe(el);

    return () => {
      if (moveHandler) chart.unsubscribeCrosshairMove(moveHandler);
      ro.disconnect();
      chart.remove();
      if (tt) tt.style.display = "none";
    };
  }, [line1Segs, line2Segs, line1Color, line2Color, line1Label, line2Label, priceFormatter]);

  return (
    <div className="candle-chart__wrap">
      <div ref={chartRef} className="candle-chart__inner" />
      <div ref={ttRef}    className="candle-chart__tooltip" />
    </div>
  );
}
