# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**PVOL** — Polymarket Implied Volatility Index. Extracts implied volatility from Polymarket BTC prediction markets and benchmarks it against Deribit's institutional DVOL index. Built for YHack 2026.

The core formula (in `backend/pvol_engine.py`): σ = |ln(H / S)| / (√T · |Φ⁻¹(P / 2)|) where H = strike, S = spot, T = time in years, P = touch probability (from Polymarket YES token price).

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build to dist/
npm run lint       # ESLint check
npm run preview    # Preview production build locally
```

### Backend (optional — not required for demo)
```bash
cd backend
pip install fastapi uvicorn httpx requests numpy scipy python-dotenv
python compute_history.py   # Regenerate history.json (~5 min, hits external APIs)
python main.py              # Start FastAPI server
```

### Docker (production frontend on port 9867)
```bash
docker-compose up           # Builds and serves frontend via Nginx on :9867
```

## Architecture

**Data flow is offline-first.** The frontend bundles precomputed historical data at `frontend/src/data/history.json` — no backend is needed to run the app.

```
Polymarket (Gamma + CLOB APIs)
CoinGecko API
Deribit API
        ↓
backend/compute_history.py   ← runs once to regenerate data
        ↓
backend/data/history.json
        ↓ (manually copy)
frontend/src/data/history.json  ← bundled into the React app
```

**Frontend** (`frontend/src/`): React 19 + Vite SPA. Three main views:
- Landing page — marketing with embedded charts
- Dashboard — three chart tabs (GAP spread, PVOL vs DVOL comparison, PVOL history) plus metric sidebar cards and a volatility smile scatter plot
- Methodology — explains the math

Charts use `lightweight-charts` (candlestick/line) and `Recharts` (scatter/smile).

**Backend** (`backend/`): Python 3.13 + FastAPI. Two distinct roles:
- `pvol_engine.py` — the computation math library (PVOL formula, data fetching, curve fitting)
- `compute_history.py` — one-shot batch script to produce `history.json`
- `routes/dashboard.py` — optional live API endpoints (`/api/dashboard`, `/api/history`, `/api/health`)

The FastAPI backend is wired to an optional `FRIEND_API_URL` environment variable for live data; it defaults to `http://localhost:9000`.

## Key Files

- [backend/pvol_engine.py](backend/pvol_engine.py) — all PVOL math: barrier option formula, logistic smile fitting, monotonicity cleaning, Polymarket/Deribit/CoinGecko API calls
- [backend/compute_history.py](backend/compute_history.py) — script to regenerate `history.json`
- [frontend/src/data/history.json](frontend/src/data/history.json) — bundled precomputed data (Jul 2025 – Feb 2026)
- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — formula derivation, product strategy, problem statement
- [docs/API_NOTES.md](docs/API_NOTES.md) — Polymarket/Deribit/CoinGecko API gotchas
- [docs/model/](docs/model/) — model design Q&A and data methodology details
