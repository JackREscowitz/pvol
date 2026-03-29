# PVOL — Polymarket Implied Volatility Index

Extracts implied volatility from Polymarket BTC prediction markets and benchmarks it against Deribit's institutional DVOL index. Built for YHack 2026.

## Running the demo

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

No backend needed. Historical data (`frontend/src/data/history.json`) is bundled directly into the app.

## Project structure

```
pvol/
├── frontend/               React + Vite app
│   └── src/
│       ├── data/
│       │   ├── history.json    precomputed PVOL/DVOL time series (Jul 2025 – Feb 2026)
│       │   └── index.js        transforms history into chart-ready format + latest snapshot
│       ├── components/
│       │   ├── Landing.jsx     marketing/landing page
│       │   ├── Dashboard.jsx   main analysis view
│       │   ├── Methodology.jsx math explanation page
│       │   ├── MetricCard.jsx  reusable metric display
│       │   ├── PivoltLogo.jsx  logo component
│       │   └── charts/
│       │       ├── CandleChart.jsx   lightweight-charts candlestick wrapper
│       │       ├── GapChart.jsx      PVOL − DVOL divergence
│       │       ├── Comparison.jsx    PVOL candles + DVOL line
│       │       ├── TwoLineChart.jsx  dual line series chart
│       │       └── PvolHistory.jsx   solo PVOL history chart
│       └── utils/
│           └── candles.js      toCandleSeries, toLineSeries, SMA, EMA
├── backend/                Python compute pipeline (offline)
│   ├── pvol_engine.py      IV inversion math + Polymarket/Deribit/CoinGecko fetching
│   └── compute_history.py  batch processor that writes history.json
└── docs/                   Product specs, API notes, model documentation
```

## Recomputing history

To regenerate `frontend/src/data/history.json` (takes several minutes, hits external APIs):

```bash
cd backend
pip install fastapi uvicorn httpx requests numpy scipy python-dotenv
python compute_history.py
# then copy backend/data/history.json → frontend/src/data/history.json
```
