import "./MetricCard.css";

export default function MetricCard({ label, sublabel, value, unit = "%", description, highlight, loading }) {
  const modClass =
    highlight === "positive" ? "mcard--positive" :
    highlight === "negative" ? "mcard--negative" : "mcard--neutral";

  return (
    <div className={`mcard ${modClass}`}>
      <div className="mcard__header">
        <span className="mcard__label">{label}</span>
        {sublabel && <span className="mcard__sublabel">{sublabel}</span>}
      </div>

      <div className="mcard__value-row">
        {loading ? (
          <div className="mcard__skeleton" />
        ) : value == null ? (
          <span className="mcard__value mcard__value--na">—</span>
        ) : (
          <>
            <span className="mcard__value">{value.toFixed(2)}</span>
            <span className="mcard__unit">{unit}</span>
          </>
        )}
      </div>

      {description && <p className="mcard__description">{description}</p>}

      <div className="mcard__accent" />
    </div>
  );
}
