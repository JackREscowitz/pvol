import { useState, useEffect } from "react";

const MAX_POINTS = 120;

/**
 * Accumulates {pvol, dvol, gap, time} snapshots from the live dashboard data.
 * Grows every time pvol or dvol changes (i.e. every poll cycle).
 */
export function useChartHistory(data) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (data?.pvol == null || data?.dvol == null) return;

    const point = {
      time:      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      pvol:      data.pvol,
      dvol:      data.dvol,
      gap:       data.gap,
    };

    setHistory(prev => {
      // avoid duplicate points on re-render
      const last = prev[prev.length - 1];
      if (last?.pvol === point.pvol && last?.dvol === point.dvol) return prev;
      return [...prev, point].slice(-MAX_POINTS);
    });
  }, [data?.pvol, data?.dvol]);

  return history;
}