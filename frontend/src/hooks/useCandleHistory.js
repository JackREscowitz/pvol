/**
 * Converts a flat time-series history array into OHLC candles for candlestick charts.
 *
 * @param {Array}  history  - Array of { timestamp (ms), pvol, dvol, gap, time }
 * @param {string} field    - Which field to use ("pvol", "dvol", or "gap")
 * @returns {Array}         - Array of { time (s), open, high, low, close }
 */
export function toCandleSeries(history, field) {
  if (!history?.length) return [];

  // Aim for ~60 candles — tightly packed, each 2 raw points wide
  const BUCKET = Math.max(1, Math.ceil(history.length / 60));
  const candles = [];

  for (let i = 0; i < history.length; i += BUCKET) {
    const bucket = history.slice(i, i + BUCKET);
    const vals   = bucket.map(p => p[field]).filter(v => v != null);
    if (!vals.length) continue;

    // Ensure strictly increasing timestamps (lightweight-charts requirement)
    const rawTime  = Math.floor(bucket[0].timestamp / 1000);
    const prevTime = candles.length ? candles[candles.length - 1].time : -Infinity;

    candles.push({
      time:  Math.max(rawTime, prevTime + 1),
      open:  vals[0],
      high:  Math.max(...vals),
      low:   Math.min(...vals),
      close: vals[vals.length - 1],
    });
  }

  return candles;
}

/**
 * Converts history to a dense line series (e.g. DVOL overlay on comparison chart).
 * Keeps every individual data point for maximum smoothness.
 * Deduplicates by timestamp.
 *
 * @param {Array}  history - Same history array
 * @param {string} field   - Field to plot as the line
 * @returns {Array}        - Array of { time (s), value }
 */
export function toLineSeries(history, field) {
  if (!history?.length) return [];

  const seen = new Set();
  return history
    .filter(p => p[field] != null)
    .map(p => ({ time: Math.floor(p.timestamp / 1000), value: p[field] }))
    .filter(p => {
      if (seen.has(p.time)) return false;
      seen.add(p.time);
      return true;
    });
}

/**
 * Simple Moving Average of candle body centers ((open+close)/2).
 * Because the average is computed from body midpoints, the resulting line
 * is always within the body region of recent candles — it threads through
 * the bodies rather than sitting above or below them.
 *
 * @param {Array}  candleData - Output of toCandleSeries
 * @param {number} period     - Lookback window (default 5)
 * @returns {Array}           - Array of { time, value }
 */
export function computeBodySMA(candleData, period = 5) {
  if (!candleData?.length) return [];
  return candleData.map((c, i) => {
    const start = Math.max(0, i - period + 1);
    const slice = candleData.slice(start, i + 1);
    const avg   = slice.reduce((sum, x) => sum + (x.open + x.close) / 2, 0) / slice.length;
    return { time: c.time, value: +avg.toFixed(4) };
  });
}

/**
 * Computes an Exponential Moving Average over candlestick close values.
 * Returns a line series at the same timestamps as the input candles —
 * it naturally weaves through the candle bodies on the same price scale.
 *
 * @param {Array}  candleData - Output of toCandleSeries
 * @param {number} period     - EMA period (default 9)
 * @returns {Array}           - Array of { time, value }
 */
export function computeEMA(candleData, period = 9) {
  if (!candleData?.length) return [];
  const k = 2 / (period + 1);
  let ema = candleData[0].close;
  return candleData.map(c => {
    ema = c.close * k + ema * (1 - k);
    return { time: c.time, value: +ema.toFixed(4) };
  });
}
