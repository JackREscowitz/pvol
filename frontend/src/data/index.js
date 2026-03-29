import raw from './history.json';

/**
 * Full history array in chart-ready format.
 * pvol/dvol/gap are in percentage points (e.g. 36.9, not 0.369).
 * timestamp is ms since epoch; used by toCandleSeries / toLineSeries.
 */
export const history = raw.map(d => ({
  timestamp: new Date(d.date).getTime(),
  pvol: +(d.pvol * 100).toFixed(2),
  dvol: +(d.dvol * 100).toFixed(2),
  gap:  +(d.gap  * 100).toFixed(2),
  spot: d.spot,
}));

function buildSmile(entry) {
  const S = entry.spot;
  const pct = v => +(v * 100).toFixed(2);
  return [
    { strike: Math.round(S * 0.80),  pvol: pct(entry.pvol_down * 1.25), touch_prob: 0.05 },
    { strike: Math.round(S * 0.875), pvol: pct(entry.pvol_down * 1.10), touch_prob: 0.15 },
    { strike: Math.round(S * 0.95),  pvol: pct(entry.pvol_down),        touch_prob: 0.35 },
    { strike: Math.round(S),         pvol: pct(entry.pvol),             touch_prob: 0.50 },
    { strike: Math.round(S * 1.05),  pvol: pct(entry.pvol_up),          touch_prob: 0.35 },
    { strike: Math.round(S * 1.125), pvol: pct(entry.pvol_up * 1.10),   touch_prob: 0.15 },
    { strike: Math.round(S * 1.20),  pvol: pct(entry.pvol_up * 1.25),   touch_prob: 0.05 },
  ];
}

// Latest computed snapshot — drives metric cards and smile chart
const latest = raw[raw.length - 1];
export const snapshot = {
  pvol:  +(latest.pvol * 100).toFixed(2),
  dvol:  +(latest.dvol * 100).toFixed(2),
  gap:   +(latest.gap  * 100).toFixed(2),
  spot:  latest.spot,
  date:  latest.date,
  smile: buildSmile(latest),
};
