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

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// 120 data points at 1-minute intervals — mean-reverting random walk
// produces realistic candle bodies and wicks when bucketed into OHLC.
export const MOCK_HISTORY = (() => {
  const rand = seededRand(42);
  const now  = Date.now();
  const pts  = [];
  let pvol = 65.0;
  let dvol = 57.8;

  for (let i = 0; i < 120; i++) {
    pvol += (rand() - 0.48) * 0.55 + (65.0 - pvol) * 0.09;
    dvol += (rand() - 0.50) * 0.42 + (57.8 - dvol) * 0.09;
    pvol  = Math.max(60, Math.min(72, pvol));
    dvol  = Math.max(54, Math.min(64, dvol));

    const t = new Date(now - (119 - i) * 60_000);
    pts.push({
      time:      t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: t.getTime(),
      pvol:      +pvol.toFixed(2),
      dvol:      +dvol.toFixed(2),
      gap:       +(pvol - dvol).toFixed(2),
    });
  }
  return pts;
})();
