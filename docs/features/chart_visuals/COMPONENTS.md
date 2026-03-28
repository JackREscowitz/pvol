# feature/chart-visuals — Components

## New Files

### `frontend/src/mockData.js`
Provides two exports used when `USE_MOCK = true`:

| Export | Shape | Purpose |
|---|---|---|
| `MOCK_DATA` | `{ pvol, dvol, gap, spot, days_remaining, smile[] }` | Single snapshot fed to sidebar metrics and SmileChart |
| `MOCK_HISTORY` | `Array<{ time, timestamp, pvol, dvol, gap }>` (24 points) | Pre-built time-series passed directly to GapChart and ComparisonChart |

The history is generated with sine/cosine offsets to produce a realistic diverging wave pattern.

---

## Modified Components

### `frontend/src/components/Dashboard.jsx`
- Imports `GapChart`, `ComparisonChart`, `SmileChart`
- Imports `MOCK_DATA`, `MOCK_HISTORY` from `mockData.js`
- `USE_MOCK = true` constant at top — set to `false` to switch to live API
- Replaces `<div id={c.id} />` chart placeholders with actual chart components
- Adds `touchStartX` ref + `handleTouchStart` / `handleTouchEnd` for swipe navigation
- Renders `carousel__indicators` (chart name pills) instead of dot buttons
- Passes `onClick` to MetricCards only when `showAll` is false

### `frontend/src/components/charts/GapChart.jsx`
- Accepts optional `history` prop
- When `history` is provided it is used directly; otherwise falls back to `useChartHistory(data)` as before

### `frontend/src/components/charts/Comparison.jsx`
- Same `history` prop pattern as `GapChart`

### `frontend/src/components/MetricCard.jsx`
- Accepts optional `onClick` prop
- Renders as `<button>` when `onClick` is provided, `<div>` otherwise
- Keyboard accessible (Enter / Space trigger click via button semantics)
- Adds `mcard--clickable` class for hover styling

---

## CSS Changes

### `frontend/src/components/Dashboard.css`
- `.chart-panel--primary` changed from `flex: 2` to `flex: 1` — all panels equal height
- Replaced `.carousel__dots` / `.carousel__dot` with `.carousel__indicators` / `.carousel__indicator` pill styles
- `*:focus`, `*:focus-visible` set to `outline: none` — removes browser yellow focus ring
- `.terminal__dq-flag` and `.terminal__error` switched to solid dark backgrounds to pass contrast checks

### `frontend/src/components/MetricCard.css`
- Added `button.mcard` reset styles (full width, no border, cursor pointer)
- Added `button.mcard:hover` background highlight
