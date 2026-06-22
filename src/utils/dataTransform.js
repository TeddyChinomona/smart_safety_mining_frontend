// ─── Severity mapping ─────────────────────────────────────────────────────────
// Backend uses: low / medium / high / critical
// Frontend uses: warning / danger
const SEV_MAP = { critical: 'danger', high: 'danger', medium: 'warning', low: 'warning' };
export const normSeverity = (s) => SEV_MAP[s] || s;

// ─── Incident status mapping ──────────────────────────────────────────────────
// Backend stores: "under_review"  /  Frontend displays: "under review"
export const normIncidentStatus = (s) => (s === 'under_review' ? 'under review' : s);
export const serIncidentStatus  = (s) => s.replace(' ', '_');

// ─── Timestamp helpers ────────────────────────────────────────────────────────
export const fmtTimestamp = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── User map ─────────────────────────────────────────────────────────────────
// Build { userId → username } lookup from the /auth/user/list/ response
export const buildUserMap = (users) =>
  Object.fromEntries(users.map((u) => [u.id, u.username]));

// ─── Alert transform ──────────────────────────────────────────────────────────
// Backend Alert → shape expected by AlertsPage / DashboardPage / ReportsPage
export const transformAlert = (a, userMap) => ({
  id:        String(a.id),
  type:      a.alert_type,
  worker:    userMap[a.worker] || `User ${a.worker}`,
  workerId:  String(a.worker),
  zone:      '',
  severity:  normSeverity(a.severity),
  status:    a.status,                          // new / acknowledged / resolved
  time:      fmtTimestamp(a.timestamp),
  message:   a.alert_type,
  timestamp: a.timestamp ? new Date(a.timestamp).getTime() : 0,
});

// ─── Incident transform ───────────────────────────────────────────────────────
// Backend Incident → shape expected by IncidentsPage
export const transformIncident = (i, userMap) => ({
  id:           String(i.id),
  title:        i.title,
  worker:       userMap[i.reporter] || `User ${i.reporter}`,
  zone:         '',
  status:       normIncidentStatus(i.status),
  date:         (i.timestamp || '').slice(0, 10),
  description:  i.description,
  linkedAlerts: i.linked_alert ? [String(i.linked_alert)] : [],
});

// ─── Workers builder ──────────────────────────────────────────────────────────
// Combines four sources:
//   users     → /auth/worker/list/   (names, system roles)
//   statusMap → WorkerStatus WS      (online status, current zone FK)
//   sensorMap → SensorEvent WS       (gas, temp, heart rate, nearest GPS sensor…)
//   zones     → /api/zones/          (resolve zone FK → name)
//   gpsMap    → /api/gps-sensors/    (id → GPSSensor; drives worker dot positions)
//
// Worker position logic (new GPS/BLE architecture):
//   The BLE wearable (Device 2) reports which GPS sensor (Device 1) it sees
//   nearest, stored as nearest_gps_sensor (DB PK integer in the serialized event).
//   We look that sensor up in gpsMap and use its last_longitude / last_latitude
//   as the worker's approximate position.  Zone.coordinates are also stored as
//   [lon, lat] = [x, y], so both spaces are consistent for ZoneMapPage.
export const buildWorkers = (users, statusMap, sensorMap, zones, gpsMap = {}) =>
  users.map((u) => {
    const st   = statusMap[u.id] || {};
    const se   = sensorMap[u.id] || {};
    const zone = zones.find((z) => z.id === st.current_zone);

    // nearest_gps_sensor is the DB integer PK of the GPSSensor record
    const gps = gpsMap[se.nearest_gps_sensor];

    return {
      id:        String(u.id),
      name:      u.username,
      role:      u.role.replace(/_/g, ' '),
      zone:      zone?.name || '',
      status:    st.status  || 'offline',
      helmet:    se.helmet_worn  ?? true,
      heartRate: se.heart_rate   ?? 0,
      gas:       se.gas_level    ?? 0,
      temp:      se.temperature  ?? 0,
      locationX: gps?.last_longitude ?? null,
      locationY: gps?.last_latitude  ?? null,
    };
  });