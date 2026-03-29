import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
});

export async function fetchDashboard() {
  const { data } = await api.get("/dashboard");
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get("/history");
  return data;
}
