export const MOCK_DATA = {
  pvol: 65.3,
  dvol: 58.1,
  gap: 7.2,
  spot: 87_500,
  days_remaining: 12,
  near_expiry: false,
  data_quality_flag: false,
  smile: [
    { strike: 70_000, pvol: 82.1, touch_prob: 0.08 },
    { strike: 75_000, pvol: 74.5, touch_prob: 0.15 },
    { strike: 80_000, pvol: 68.2, touch_prob: 0.28 },
    { strike: 85_000, pvol: 63.8, touch_prob: 0.44 },
    { strike: 87_500, pvol: 65.3, touch_prob: 0.50 },
    { strike: 90_000, pvol: 67.1, touch_prob: 0.44 },
    { strike: 95_000, pvol: 71.4, touch_prob: 0.28 },
    { strike: 100_000, pvol: 77.9, touch_prob: 0.15 },
    { strike: 105_000, pvol: 85.2, touch_prob: 0.08 },
  ],
};

const now = Date.now();
export const MOCK_HISTORY = Array.from({ length: 24 }, (_, i) => {
  const t    = new Date(now - (23 - i) * 5 * 60_000);
  const pvol = 60 + Math.sin(i * 0.4) * 6 + i * 0.22;
  const dvol = 56 + Math.cos(i * 0.3) * 4 + i * 0.10;
  return {
    time:      t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp: t.getTime(),
    pvol:      +pvol.toFixed(2),
    dvol:      +dvol.toFixed(2),
    gap:       +(pvol - dvol).toFixed(2),
  };
});
