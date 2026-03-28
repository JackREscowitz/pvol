# feature/dashboard-core — Components & Hooks

## Components

### `Dashboard.jsx`

Top-level page component. Owns all layout state.

**State**

| State | Type | Default | Purpose |
|---|---|---|---|
| `showAll` | `boolean` | `false` | Toggle between carousel and all-charts view |
| `activeIdx` | `number` | `0` | Which chart is active in carousel mode |

**Data hooks used**

| Hook | Source |
|---|---|
| `useDashboardData` | FastAPI `/api/dashboard` → friend's API at port 9000 |
| `useBtcPrice` | Binance public REST API (independent fallback) |

---

### `MetricCard.jsx`

Renders a single number in the right sidebar.

**Props**

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Uppercase heading (e.g. `GAP`) |
| `sublabel` | `string` | Secondary descriptor (e.g. `PVOL − DVOL`) |
| `value` | `number \| null` | The metric value; `null` triggers loading state |
| `unit` | `string` | Appended unit (e.g. `%`) |
| `description` | `string` | One-line explanation shown below the value |
| `highlight` | `"positive" \| "negative" \| "neutral"` | Colors the value and accent bar |
| `loading` | `boolean` | Shows shimmer skeleton when `true` |

**Highlight colors**

| State | Value color | Accent bar | Label color |
|---|---|---|---|
| `positive` | `#4ade80` (green) | `#22c55e` | `#22c55e` |
| `negative` | `#f87171` (red) | `#ef4444` | `#ef4444` |
| `neutral` | `#fff` | `#2a2a4a` | `#fff` |

---

## Hooks

### `useDashboardData.js`

Polls `GET /api/dashboard` every 60 seconds.

**Returns**

| Field | Type | Description |
|---|---|---|
| `data` | `object \| null` | Full dashboard payload from backend |
| `loading` | `boolean` | True on first load |
| `error` | `string \| null` | Error message if backend unreachable |
| `lastUpdated` | `Date \| null` | Timestamp of last successful fetch |
| `refresh` | `function` | Manual re-fetch trigger |

**Backend payload shape**

```json
{
  "pvol": 58.4,
  "dvol": 52.1,
  "gap": 6.3,
  "smile": [{ "strike": 85000, "iv": 0.55 }],
  "spot": 83500,
  "days_remaining": 18,
  "near_expiry": false,
  "data_quality_flag": false,
  "dropped_rungs": []
}
```

---

### `useBtcPrice.js`

Fetches BTC/USDT spot price from Binance every 30 seconds. Runs independently of the backend — price stays live even when the friend's API is down.

**Endpoint:** `https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT`

**Returns:** `number | null`

---

## Typography Rules

All text is white (`#fff`) by default. The following are intentional exceptions:

| Element | Color | Reason |
|---|---|---|
| Brand subtitle | `#8888aa` | Secondary / decorative |
| Ticker labels (DVOL, EXPIRY) | `#8888aa` | Small-caps label, not primary data |
| Chart subtitles | `#8888aa` | Supporting copy |
| Metric sublabels + descriptions | `#8888aa` | Supporting copy |
| Currency chevron | `#8888aa` | UI decoration |
| Expiry countdown (near expiry) | `#f59e0b` | Warning state |
| DQ flag | `#f59e0b` | Warning state |
| Error banner | `#ef4444` | Error state |
| GAP positive value | `#4ade80` | Semantic green |
| GAP negative value | `#f87171` | Semantic red |
| N/A placeholder | `#444466` | Empty / no-data state |
