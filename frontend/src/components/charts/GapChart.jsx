import { useMemo } from "react";
import { useChartHistory } from "../../hooks/useChartHistory.js";
import { toCandleSeries, computeBodySMA } from "../../hooks/useCandleHistory.js";
import CandleChart from "./CandleChart.jsx";
import "./GapChart.css";

const gapFormatter = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export default function GapChart({ data, loading, history: historyProp }) {
  const liveHistory = useChartHistory(historyProp ? null : data);
  const history     = historyProp ?? liveHistory;

  const candleData = useMemo(() => toCandleSeries(history, "gap"), [history]);
  const lineData   = useMemo(() => computeBodySMA(candleData, 5), [candleData]);

  if (loading && history.length === 0) {
    return <div className="gchart-empty"><span className="gchart-pulse" />Loading data…</div>;
  }
  if (history.length === 0) {
    return <div className="gchart-empty">Waiting for first data point…</div>;
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
