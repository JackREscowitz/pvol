# feature/dashboard-core — Layout

## Structure

```
┌─────────────────────────────────────────────────────┬──────────┐
│  TOPBAR  (brand · currency selector · ticker · actions)        │
├─────────────────────────────────────────────────────┼──────────┤
│                                                     │          │
│              CHARTS COLUMN                          │ SIDEBAR  │
│         (single carousel  OR  all stacked)          │          │
│                                                     │  GAP     │
│                                                     │  PVOL    │
│                                                     │  DVOL    │
│                                                     │          │
└─────────────────────────────────────────────────────┴──────────┘
```

The layout is a full-viewport flex column (`height: 100vh`, `overflow: hidden`). The body row is a horizontal flex: charts column takes all remaining width, sidebar is fixed at 260 px.

---

## Topbar

Fixed height 52 px. Three sections:

| Section | Contents |
|---|---|
| Brand (left) | `PVOL` wordmark + `Polymarket Implied Volatility` subtitle |
| Ticker (center) | Currency selector pill · DVOL value · Expiry countdown |
| Actions (right) | Data-quality flag · Layout toggle · Refresh button |

### Currency Selector

Inline BTC pill with the Bitcoin SVG logo, `BTC` label, and a chevron. The spot price renders immediately to the right, pulled from **Binance's public ticker API** (`/api/v3/ticker/price?symbol=BTCUSDT`) every 30 seconds — independent of the backend so it shows even when the friend's API is down.

---

## Charts Column

The charts column has two modes controlled by the `showAll` state toggle.

### Single / Carousel mode (default)

Only one chart panel fills the entire column. Three dot buttons at the bottom let the user step through:

1. **GAP · PVOL − DVOL** — Historical divergence
2. **PVOL Smile** — Implied vol by strike
3. **PVOL vs DVOL** — Index comparison over time

The active dot is highlighted in purple. Clicking any dot switches instantly.

### All-charts mode

All three panels are stacked vertically and sized by flex ratio:

| Panel | Flex | CSS class |
|---|---|---|
| GAP | 2 | `chart-panel--primary` |
| PVOL Smile | 1 | `chart-panel` |
| PVOL vs DVOL | 1 | `chart-panel` |

Each panel header holds a title + subtitle. The canvas area (`chart-panel__canvas`) is the drop zone for chart components — identified by `id`: `gap-chart`, `smile-chart`, `comparison-chart`.

---

## Sidebar

Fixed 260 px right column. Contains three `MetricCard` components (GAP, PVOL, DVOL) and a last-updated timestamp pinned to the bottom.

---

## Key CSS Files

| File | Purpose |
|---|---|
| `src/components/Dashboard.css` | All layout, topbar, chart panels, carousel, toggle |
| `src/components/MetricCard.css` | Sidebar metric card styles and highlight states |
| `src/index.css` | Global font and background reset |
