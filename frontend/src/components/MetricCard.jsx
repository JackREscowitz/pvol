import "./MetricCard.css";

function ValueDisplay({ value, unit }) {
  if (value == null) return <span className="mcard__value mcard__value--na">—</span>;
  return (
    <>
      <span className="mcard__value">{value.toFixed(2)}</span>
      <span className="mcard__unit">{unit}</span>
    </>
  );
}

export default function MetricCard({ label, sublabel, value, unit = "%", description, highlight, loading, onClick }) {
  const modClass =
    highlight === "positive" ? "mcard--positive" :
    highlight === "negative" ? "mcard--negative" : "mcard--neutral";

  const inner = (
    <>
      <div className="mcard__header">
        <span className="mcard__label">{label}</span>
        {sublabel && <span className="mcard__sublabel">{sublabel}</span>}
      </div>

      <div className="mcard__value-row">
        {loading
          ? <div className="mcard__skeleton" />
          : <ValueDisplay value={value} unit={unit} />}
      </div>

      {description && <p className="mcard__description">{description}</p>}

      <div className="mcard__accent" />
    </>
  );

  if (onClick) {
    return (
      <button className={`mcard ${modClass} mcard--clickable`} onClick={onClick}>
        {inner}
      </button>
    );
  }

  return <div className={`mcard ${modClass}`}>{inner}</div>;
}
