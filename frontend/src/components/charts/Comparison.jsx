import { useMemo } from "react";
import { useChartHistory } from "../../hooks/useChartHistory.js";
import { toCandleSeries, toLineSeries } from "../../hooks/useCandleHistory.js";
import CandleChart from "./CandleChart.jsx";
import "./ComparisonChart.css";

const pvolFormatter = v => `${v.toFixed(2)}%`;

export default function ComparisonChart({ data, loading, history: historyProp }) {
  const liveHistory = useChartHistory(historyProp ? null : data);
  const history     = historyProp ?? liveHistory;

  const candleData = useMemo(() => toCandleSeries(history, "pvol"), [history]);
  const lineData   = useMemo(() => toLineSeries(history, "dvol"),   [history]);

  if (loading && history.length === 0) {
    return <div className="cchart-empty"><span className="gchart-pulse" />Loading…</div>;
  }
  if (history.length === 0) {
    return <div className="cchart-empty">Waiting for first data point…</div>;
  }

  return (
    <div className="cchart-wrap">
      <CandleChart
        candleData={candleData}
        lineData={lineData}
        lineColor="#eab308"
        priceFormatter={pvolFormatter}
        scaleMargins={{ top: 0.06, bottom: 0.06 }}
        independentLine={true}
      />
    </div>
  );
}
