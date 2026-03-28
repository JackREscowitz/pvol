# feature/dashboard-core — Overview

## What This Branch Delivers

`feature/dashboard-core` establishes the full visual shell of the PVOL dashboard — the layout, navigation, typography, and live data plumbing needed before any chart library is dropped in.

The branch does not yet render real chart visuals. Instead it sets up every panel, slot, and state hook so that chart components can be added in a follow-on branch with zero structural rework.

---

## Goals

| Goal | Status |
|---|---|
| Responsive terminal-style layout | Done |
| Live BTC spot price in topbar (independent of backend) | Done |
| CORS fix so frontend can reach the FastAPI backend | Done |
| Three chart panels: GAP, PVOL Smile, PVOL vs DVOL | Done |
| Single-chart carousel (home screen) + all-charts toggle | Done |
| Sidebar metric cards: GAP, PVOL, DVOL | Done |
| All-white typography with intentional exceptions | Done |

---

## Branch Scope

- **Frontend only** (`frontend/src/`)
- No chart library integrated yet — panels render a grid placeholder background
- Backend route (`/api/dashboard`) already existed; this branch only fixed the CORS allowlist

---

## What Comes Next

- `feature/charts-visuals` — drops Recharts/D3 components into the three canvas slots (`#gap-chart`, `#smile-chart`, `#comparison-chart`)
- `feature/friend-api` — replaces the mock stub at port 9000 with the real Polymarket + Deribit data pipeline
