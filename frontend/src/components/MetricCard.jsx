import "./MetricCard.css";

export default function MetricCard({ label, sublabel, value, unit = "%", description, highlight, onClick }) {
  const mod = highlight === "positive" ? "mcard--positive"
            : highlight === "negative" ? "mcard--negative"
            : "mcard--neutral";

  const Tag = onClick ? "button" : "div";

  const sign = highlight === "positive" && value > 0 ? "+" : "";
  const display = value == null ? "—" : `${sign}${value.toFixed(2)}`;

  return (
    <Tag className={`mcard ${mod}${onClick ? " mcard--btn" : ""}`} onClick={onClick}>
      <div className="mcard__accent" />
      <div className="mcard__body">
        <div className="mcard__value-row">
          <span className="mcard__value">{display}</span>
          <span className="mcard__unit">{unit}</span>
        </div>
        <div className="mcard__labels">
          <span className="mcard__label">{label}</span>
          {sublabel && <span className="mcard__sublabel">{sublabel}</span>}
        </div>
        {description && <p className="mcard__desc">{description}</p>}
      </div>
    </Tag>
  );
}
