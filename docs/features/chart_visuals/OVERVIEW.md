# feature/chart-visuals — Overview

## What This Branch Delivers

`feature/chart-visuals` wires the three Recharts chart components into the live dashboard, introduces mock data for local development, adds swipe gesture navigation, and fixes several UX and accessibility issues.

---

## Goals

| Goal | Status |
|---|---|
| GapChart rendered inside dashboard panel | Done |
| SmileChart rendered inside dashboard panel | Done |
| ComparisonChart rendered inside dashboard panel | Done |
| Mock data module with realistic snapshot + 24-point history | Done |
| Swipe left/right to cycle charts (mobile-friendly) | Done |
| Chart name pill indicators replacing dot navigation | Done |
| Sidebar MetricCards clickable to jump to matching chart | Done |
| Sidebar clicks disabled in all-charts mode | Done |
| Equal-height chart panels in all-charts view | Done |
| Yellow focus outline removed globally | Done |
| Contrast warnings fixed (solid dark backgrounds) | Done |

---

## Branch Scope

- **Frontend only** (`frontend/src/`)
- No backend changes — mock data bypasses the API via a `USE_MOCK = true` flag in `Dashboard.jsx`
- Switching `USE_MOCK` to `false` restores live API behaviour with zero other changes
- `recharts` added to `package.json` dependencies
