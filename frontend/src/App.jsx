import ComparisonChart from "./components/charts/Comparison.jsx";
import GapChart from "./components/charts/GapChart.jsx";

// Replace these with real values from your data source
const pvol = 0;
const dvol = 0;

const data = { pvol, dvol, gap: pvol - dvol };

export default function App() {
  return (
    <>
      <ComparisonChart data={data} loading={false} />
      <GapChart data={data} loading={false} />
    </>
  );
}
