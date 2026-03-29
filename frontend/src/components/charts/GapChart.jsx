import { useMemo } from "react";
import { toCandleSeries, computeBodySMA } from "../../utils/candles.js";
import CandleChart from "./CandleChart.jsx";
import "./GapChart.css";

const gapFormatter = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export default function GapChart({ history }) {
  const candleData = useMemo(() => toCandleSeries(history, "gap"), [history]);
  const lineData   = useMemo(() => computeBodySMA(candleData, 5), [candleData]);

  if (!history?.length) {
    return <div className="gchart-empty">No history data</div>;
  }

  return (
    <div className="gchart-wrap">
      <CandleChart
        candleData={candleData}
        lineData={lineData}
        lineColor="#e2e8f0"
        priceFormatter={gapFormatter}
      />
    </div>
  );
}
