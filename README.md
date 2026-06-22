# Smart Safety Mining — Frontend

A real-time safety monitoring dashboard for underground mining operations. Connects to the Django backend via REST API and WebSocket to display live worker statuses, sensor readings, geofence zones, alerts, and incident reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 (plain JavaScript — no TypeScript) |
| Build tool | Vite |
| HTTP client | Axios (with JWT interceptors + auto-refresh) |
| Real-time | Native WebSocket API |
| Routing | React Router DOM |
| Styling | Inline styles with a shared design-token system |

---

## Features

| Page | Description |
|---|---|
| **Dashboard** | Fleet overview — active workers, live alerts, unsafe zones, fleet-average gas and temperature |
| **Workers** | Per-worker status list with live sensor readings (gas, temperature, heart rate, helmet status); detail panel with live gauges |
| **Zone Map** | SVG map rendered from GPS convex hull coordinates; mining session management (start / end); live "LIVE FENCE" indicator |
| **Alerts** | Filterable alert list (by status and severity); acknowledge / resolve actions |
| **Incidents** | Incident log with inline report form; status transitions (open → under review → resolved) |
| **Analytics** | Live fleet-average sparklines (gas, temperature, heart rate); per-worker sensor strip; AI pattern detection panel |
| **Reports** | Safety summary stats; alerts-by-day bar chart; risk score by zone; worker risk ranking; CSV export |

---

## Project Structure

```
src/
├── main.jsx                   ← React root (BrowserRouter)
├── App.jsx                    ← Global state, data loading, WebSocket lifecycle
│
├── LoginPage.jsx
├── Sidebar.jsx
├── TopBar.jsx
├── DashboardPage.jsx
├── WorkersPage.jsx
├── ZoneMapPage.jsx
├── AlertsPage.jsx
├── IncidentsPage.jsx
├── AnalyticsPage.jsx
├── ReportsPage.jsx
├── ui.jsx                     ← Shared components: StatusBadge, StatCard, GaugeBar
│
├── services/
│   ├── api.js                 ← Axios instance, JWT attach interceptor, auto-refresh on 401
│   ├── authService.js         ← login, logout, getProfile, getUsers, getAllUsers
│   ├── apiService.js          ← zones, sessions, GPS sensors, alerts, incidents, analytics
│   └── wsService.js           ← WsService class — manages sensor, worker, zone WebSocket connections
│
└── utils/
    ├── colors.js              ← Design tokens (COLORS object)
    ├── statusHelpers.js       ← statusColor(), statusBg(), fmtTime()
    ├── navigation.js          ← NAV_ITEMS array (sidebar + topbar)
    └── dataTransform.js       ← buildWorkers(), transformAlert(), transformIncident(), buildUserMap()
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- The Django backend running and accessible (see [backend README](../README_backend.md))

### Install and run

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173` by default.

### Build for production

```bash
npm run build
```

---

## Configuration

The backend base URL is set in `src/services/api.js`:

```js
export const BASE_URL = 'http://127.0.0.1:8000';
export const WS_URL   = 'ws://127.0.0.1:8000';
```

Change these if the backend is running on a different host or port.

---

## Authentication Flow

1. User submits credentials on `LoginPage` → `authService.login()` → `POST /auth/login/`
2. `access` and `refresh` JWT tokens are stored in `localStorage`
3. The Axios interceptor in `api.js` attaches `Authorization: Bearer <access>` to every request
4. On a `401` response the interceptor silently calls `POST /auth/token/refresh/`, updates the stored access token, and retries the original request
5. If the refresh also fails, `localStorage` is cleared and an `auth:logout` event is dispatched — `App.jsx` listens for this and returns the user to the login page
6. On logout, `wsService.disconnect()` closes all three WebSocket connections cleanly before tokens are cleared

---

## WebSocket Integration

`wsService.js` manages three persistent connections:

| Key | Endpoint | Data delivered |
|---|---|---|
| `sensor` | `ws/sensor-events/?token=…` | Latest BLE sensor readings per worker |
| `worker` | `ws/worker-statuses/?token=…` | Real-time worker status (safe / warning / danger / offline) |
| `zone` | `ws/zone-updates/?token=…` | Live zone coordinates as GPS task recomputes the convex hull |

### Connection lifecycle

- All sockets are opened by `wsService.connect(onSensor, onWorker, onZone)` called in `App.useEffect` after login
- Each socket passes `?token=<access_token>` in the URL; the backend consumer validates it before accepting
- On close code `4001` (JWT rejected): the service silently refreshes the token and reconnects; if refresh fails it fires `auth:logout`
- On any other unexpected close: 4-second reconnect backoff
- On intentional close (code `1000`): no reconnect

### Message shapes

**Sensor events**
```json
// On connect
{ "type": "initial_data", "data": [ ...last50SensorEvents ] }

// Live updates
{ "type": "new_event", "data": { ...sensorEvent } }
```

**Worker statuses**
```json
// On connect
{ "type": "initial_data", "data": [ ...allWorkerStatuses ] }

// Live updates
{ "type": "status_update", "data": { ...workerStatus } }
```

**Zone updates**
```json
// On connect
{ "type": "initial_data", "data": [ ...allZones ] }

// Live updates
{ "type": "zone_update", "data": { ...zone } }
```

---

## State and Data Flow

All shared state lives in `App.jsx`. Pages receive derived props — they never fetch data themselves.

```
App.jsx
  │
  ├── REST (on login)
  │     ├── authService.getUsers()          → users[]       (role=worker only)
  │     ├── authService.getAllUsers()        → userMapRef    (all roles; 403 for workers → fallback)
  │     ├── apiService.getAlerts()          → rawAlerts[]
  │     ├── apiService.getIncidents()       → rawIncidents[]
  │     ├── apiService.getZones()           → zones[]
  │     ├── apiService.getActiveSessions()  → sessions[]
  │     └── apiService.getGpsSensors()      → gpsMapRef     (403 for workers → empty)
  │
  ├── WebSocket (live updates)
  │     ├── handleSensor  → sensorMap  { workerId → latestSensorEvent }
  │     ├── handleWorker  → statusMap  { workerId → workerStatus }
  │     └── handleZone    → zones[]    (patched in-place on zone_update)
  │
  └── Derived (computed on every render, no extra state)
        ├── workers  = buildWorkers(users, statusMap, sensorMap, zones, gpsMap)
        ├── alerts   = rawAlerts.map(a => transformAlert(a, userMap))
        └── incidents = rawIncidents.map(i => transformIncident(i, userMap))
```

### `buildWorkers` — worker position logic

Each worker entry is built by joining four sources:

- `users` — username and role from `/auth/worker/list/`
- `statusMap` — online status and `current_zone` FK from the `worker-statuses` WebSocket
- `sensorMap` — gas, temperature, heart rate, helmet status, and `nearest_gps_sensor` (DB PK) from the `sensor-events` WebSocket
- `gpsMap` — the GPS sensor record is looked up by that PK; its `last_longitude` / `last_latitude` become `locationX` / `locationY` for the SVG map dot

---

## Design System

All colours are defined in `src/utils/colors.js` as the `COLORS` object. Pages import only this object — no CSS variables or external design library is used.

**Palette:**

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0d0f12` | Page background |
| `surface` | `#141820` | Cards and panels |
| `textPrimary` | `#e8ecf4` | Headings and values |
| `textSecondary` | `#7b8ca8` | Labels and metadata |
| `safe` | `#00d4aa` | Safe status |
| `warning` | `#f59e0b` | Warning status |
| `danger` | `#ef4444` | Danger / critical status |
| `accent` | `#3b82f6` | Interactive elements |
| `offline` | `#4a5568` | Offline / inactive |

Status-to-colour resolution and background-dim variants are handled by `statusColor(s)` and `statusBg(s)` in `src/utils/statusHelpers.js`.

---

## Shared UI Components

Defined in `src/ui.jsx`:

| Component | Props | Description |
|---|---|---|
| `StatusBadge` | `status`, `size` | Pill badge with status-mapped colour |
| `StatCard` | `label`, `value`, `sub`, `color` | KPI card used on Dashboard and Reports |
| `GaugeBar` | `label`, `value`, `max`, `color`, `unit` | Horizontal progress bar with value label |

---

## Zone Map

The SVG map in `ZoneMapPage` renders zone polygons directly from `Zone.coordinates` — a `[[lon, lat], ...]` array computed by the backend GPS Celery task as the convex hull of all active GPS sensor readings.

- Coordinates are normalised into a `0–100` SVG viewBox with padding
- Zones are colour-coded by `risk_level` (safe → teal, warning → amber, unsafe → red)
- Worker dots are placed at their nearest GPS sensor's last known position
- Danger-status workers have an animated pulsing ring
- The map shows a "Start a session and run simulate\_gps.py" placeholder until at least 3 GPS readings have been processed

### Session management

The `SessionsPanel` inside `ZoneMapPage` allows Admin / Manager / Officer users to:
- Start a new session (creating a new zone or attaching to an existing one)
- End an active session (marks it `completed` and deactivates its GPS sensors)

Workers see the panel but cannot start or end sessions.

---

## Role-Aware Behaviour

The frontend does not hard-code role checks for most UI. Instead, it relies on the API returning `403` for unauthorised actions and falls back gracefully:

- `getAllUsers()` — returns full user list for Admin / Manager / Officer; returns `403` for Workers, which `App.jsx` catches and falls back to `getUsers()` (workers-only list)
- `getGpsSensors()` — returns `403` for Workers; `App.jsx` catches and falls back to `[]`
- Session start/end buttons are rendered for all authenticated users; the API enforces the role restriction

---

## Key Patterns

**No form tags** — all form-like interactions use `onClick` / `onChange` handlers on plain `div` / `input` elements to avoid HTML form submission behaviour.

**Optimistic UI** — alert and incident status updates are applied to local state immediately after a successful API response, without waiting for a WebSocket broadcast.

**Stable WebSocket handlers** — `handleSensor`, `handleWorker`, and `handleZone` are wrapped in `useCallback` so `wsService.connect()` is only called when `user` changes, not on every render.

**Data separation** — raw API shapes (`rawAlerts`, `rawIncidents`) are kept in state and transformed to frontend shapes (`alerts`, `incidents`) on each render via `transformAlert` and `transformIncident`. This means a single severity mapping (`critical/high → danger`, `medium/low → warning`) and incident status normalisation (`under_review → under review`) are applied consistently in one place.
