import { useMemo } from "react";
import { toCandleSeries, computeEMA } from "../../utils/candles.js";
import CandleChart from "./CandleChart.jsx";
import "./GapChart.css";

const pvolFormatter = v => `${v.toFixed(2)}%`;

export default function PvolHistory({ history }) {
  const candleData = useMemo(() => toCandleSeries(history, "pvol"), [history]);
  const lineData   = useMemo(() => computeEMA(candleData, 9),       [candleData]);

  if (!history?.length) {
    return <div className="gchart-empty">No history data</div>;
  }

  return (
    <div className="gchart-wrap">
      <CandleChart
        candleData={candleData}
        lineData={lineData}
        lineColor="#818cf8"
        priceFormatter={pvolFormatter}
      />
    </div>
  );
}
