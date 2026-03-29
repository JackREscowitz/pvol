import { useState } from "react";
import Landing from "./components/Landing.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Methodology from "./components/Methodology.jsx";
import "./App.css";

export default function App() {
  const [view, setView] = useState("landing");

  if (view === "dashboard") return <Dashboard onBack={() => setView("landing")} onMethodology={() => setView("methodology")} />;
  if (view === "methodology") return <Methodology onBack={() => setView("landing")} />;
  return <Landing onEnter={() => setView("dashboard")} onMethodology={() => setView("methodology")} />;
}
