# feature/chart-visuals — Layout & UX

## Chart Panel Layout

All three chart panels share equal flex space (`flex: 1`) in both single and all-charts views.

```
┌─────────────────────────────────────────┬──────────────┐
│  chart panel (flex: 1)                  │  GAP card    │
│  ┌────────────────────────────────────┐ │  PVOL card   │
│  │ chart-panel__header (title + sub)  │ │  DVOL card   │
│  ├────────────────────────────────────┤ │              │
│  │ chart-panel__canvas (flex: 1)      │ │              │
│  │  └── <GapChart />                  │ │              │
│  └────────────────────────────────────┘ │              │
├─────────────────────────────────────────┤              │
│  [GAP · PVOL−DVOL] [PVOL Smile] [PVOL vs DVOL]        │
└────────────────────────────────────────────────────────┘
```

---

## Navigation Modes

### Single / Carousel View (default)
- One chart fills the entire panel area
- Swipe left → next chart, swipe right → previous chart (threshold: 40px)
- Chart name pill indicators at the bottom show active chart (highlighted in blue)
- Clicking a sidebar MetricCard switches to that chart:
  - GAP → GAP · PVOL − DVOL (index 0)
  - PVOL → PVOL Smile (index 1)
  - DVOL → PVOL vs DVOL (index 2)

### All-Charts View
- All three panels rendered simultaneously, each with `flex: 1` equal height
- Sidebar MetricCards are non-interactive (display only)
- Toggled via the "All charts" button in the topbar

---

## Mock Data Flow

```
USE_MOCK = true
      │
      ├── MOCK_DATA  ──► sidebar MetricCards (gap, pvol, dvol, spot)
      │                ► SmileChart (smile[], spot)
      │
      └── MOCK_HISTORY ► GapChart  (history prop bypasses useChartHistory)
                       ► ComparisonChart (same)
```

When `USE_MOCK = false`, `useDashboardData()` polls `/api/dashboard` every 60 seconds and `useChartHistory` accumulates live points.

---

## Accessibility & Focus

- MetricCards rendered as `<button>` when clickable — fully keyboard navigable
- `outline: none` applied globally to remove the default yellow browser focus ring
- Chart indicator pills have hover + active states for clear visual feedback
