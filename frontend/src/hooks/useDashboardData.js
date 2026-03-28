import { useState, useEffect, useCallback } from "react";
import { fetchDashboard } from "../api/index.js";

const POLL_INTERVAL_MS = 60_000;

export function useDashboardData() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchDashboard();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.detail ?? err.message ?? "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { data, loading, error, lastUpdated, refresh: load };
}
