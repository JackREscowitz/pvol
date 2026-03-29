/**
 * Inline SVG bolt + "Pivolt" wordmark.
 * Scales via fontSize prop; bolt height is derived from it automatically.
 */
export default function PivoltLogo({ fontSize = 15, color = "#e8e8f0", accentColor = "#4488ff" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(fontSize * 0.4) + "px" }}>
      <svg
        width={Math.round(fontSize * 0.65)}
        height={Math.round(fontSize * 1.1)}
        viewBox="0 0 12 20"
        fill="none"
        aria-hidden="true"
      >
        <path d="M 8 0 L 0 12 L 5 12 L 4 20 L 12 8 L 7 8 Z" fill={accentColor} />
      </svg>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: fontSize + "px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        color,
        lineHeight: 1,
      }}>
        Pivolt
      </span>
    </span>
  );
}
