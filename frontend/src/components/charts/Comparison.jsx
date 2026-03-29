import { useMemo } from "react";
import { toSegmentedLine } from "../../utils/candles.js";
import TwoLineChart from "./TwoLineChart.jsx";
import "./ComparisonChart.css";

const formatter = v => `${v.toFixed(2)}%`;

export default function ComparisonChart({ history }) {
  const pvolSegs = useMemo(() => toSegmentedLine(history, "pvol"), [history]);
  const dvolSegs = useMemo(() => toSegmentedLine(history, "dvol"), [history]);

  if (!history?.length) {
    return <div className="cchart-empty">No history data</div>;
  }

  return (
    <div className="cchart-wrap">
      <TwoLineChart
        line1Segs={pvolSegs}
        line2Segs={dvolSegs}
        line1Color="#4488ff"
        line2Color="#eab308"
        line1Label="PVOL"
        line2Label="DVOL"
        priceFormatter={formatter}
      />
    </div>
  );
}
