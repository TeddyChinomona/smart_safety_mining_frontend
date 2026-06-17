import { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS }       from './utils/colors';
import { authService }  from './services/authService';
import { apiService }   from './services/apiService';
import { wsService }    from './services/wsService';
import {
  buildUserMap, buildWorkers,
  transformAlert, transformIncident,
  serIncidentStatus,
} from './utils/dataTransform';

import { Sidebar }       from './Sidebar';
import { TopBar }        from './TopBar';
import { LoginPage }     from './LoginPage';
import { DashboardPage } from './DashboardPage';
import { WorkersPage }   from './WorkersPage';
import { ZoneMapPage }   from './ZoneMapPage';
import { AlertsPage }    from './AlertsPage';
import { IncidentsPage } from './IncidentsPage';
import { AnalyticsPage } from './AnalyticsPage';
import { ReportsPage }   from './ReportsPage';

export default function App() {
  const [user,       setUser]       = useState(null);
  const [page,       setPage]       = useState('dashboard');
  const [appLoading, setAppLoading] = useState(true);
  const [dataReady,  setDataReady]  = useState(false);

  // ── REST data ────────────────────────────────────────────────────────────────
  // users = role:'worker' only → drives the Workers page display
  const [users,        setUsers]        = useState([]);
  const [rawAlerts,    setRawAlerts]    = useState([]);
  const [rawIncidents, setRawIncidents] = useState([]);
  const [zones,        setZones]        = useState([]);

  // ── WebSocket data ───────────────────────────────────────────────────────────
  const [statusMap, setStatusMap] = useState({});   // WorkerStatus  { userId → ws }
  const [sensorMap, setSensorMap] = useState({});   // SensorEvent   { userId → ws }

  // ── User lookup map ──────────────────────────────────────────────────────────
  // Built from ALL users when the logged-in role allows it (admin/manager/officer),
  // falls back to workers-only list for worker logins.  Stored in a ref so
  // transform functions always see the latest version without triggering re-renders.
  const userMapRef = useRef({});

  // ── Derived state ────────────────────────────────────────────────────────────
  const alerts    = rawAlerts.map((a) => transformAlert(a, userMapRef.current));
  const incidents = rawIncidents.map((i) => transformIncident(i, userMapRef.current));
  // workers only contains role:'worker' users — managers/admins/officers are excluded
  const workers   = buildWorkers(users, statusMap, sensorMap, zones);

  const newAlertCount = alerts.filter((a) => a.status === 'new').length;

  // ── Initial data load ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [workersData, allUsersData, alertsData, incidentsData, zonesData] = await Promise.all([
        authService.getUsers(),          // role:'worker' only — Workers page
        authService.getAllUsers()         // all roles — complete userMap
          .catch(() => null),            // workers get 403 here; null triggers fallback below
        apiService.getAlerts(),
        apiService.getIncidents(),
        apiService.getZones(),
      ]);

      // Prefer the full user list; fall back to workers-only so transforms still work
      userMapRef.current = buildUserMap(allUsersData ?? workersData);
      setUsers(workersData);
      setRawAlerts(alertsData);
      setRawIncidents(incidentsData);
      setZones(zonesData);
    } catch (e) {
      console.error('Initial data load failed:', e);
    } finally {
      setDataReady(true);
    }
  }, []);

  // ── WebSocket handlers ───────────────────────────────────────────────────────
  const handleSensor = useCallback((msg) => {
    if (msg.type === 'initial_data') {
      const map = {};
      (msg.data || []).forEach((ev) => {
        if (!map[ev.worker] || ev.timestamp > map[ev.worker].timestamp) {
          map[ev.worker] = ev;
        }
      });
      setSensorMap(map);
    } else if (msg.type === 'new_event') {
      setSensorMap((prev) => ({ ...prev, [msg.data.worker]: msg.data }));
    }
  }, []);

  const handleWorker = useCallback((msg) => {
    if (msg.type === 'initial_data') {
      const map = {};
      (msg.data || []).forEach((ws) => { map[ws.worker] = ws; });
      setStatusMap(map);
    } else if (msg.type === 'status_update') {
      setStatusMap((prev) => ({ ...prev, [msg.data.worker]: msg.data }));
    }
  }, []);

  // ── Bootstrap: restore session on page load ──────────────────────────────────
  useEffect(() => {
    if (authService.isAuthenticated()) {
      authService.getProfile()
        .then(setUser)
        .catch(() => authService.logout())
        .finally(() => setAppLoading(false));
    } else {
      setAppLoading(false);
    }
  }, []);

  // ── Global logout event (fired by API interceptor or WS service) ─────────────
  useEffect(() => {
    const handler = () => {
      setUser(null);
      wsService.disconnect();
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  // ── Start data + WS when authenticated ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadData();
    wsService.connect(handleSensor, handleWorker);
    return () => wsService.disconnect();
  }, [user, loadData, handleSensor, handleWorker]);

  // ── Auth actions ─────────────────────────────────────────────────────────────
  const handleLogin = async (username, password) => {
    try {
      await authService.login(username, password);
      const profile = await authService.getProfile();
      setUser(profile);
      return null;
    } catch (e) {
      return e.response?.data?.error || 'Login failed. Check your credentials.';
    }
  };

  const handleSignOut = async () => {
    wsService.disconnect();
    await authService.logout();
    setUser(null);
    setUsers([]); setRawAlerts([]); setRawIncidents([]); setZones([]);
    setStatusMap({}); setSensorMap({});
    setDataReady(false);
    userMapRef.current = {};
  };

  // ── Alert handlers ────────────────────────────────────────────────────────────
  const handleAlertStatus = async (id, newStatus) => {
    try {
      await apiService.updateAlert(id, { status: newStatus });
      setRawAlerts((prev) =>
        prev.map((a) => (String(a.id) === String(id) ? { ...a, status: newStatus } : a))
      );
    } catch (e) {
      console.error('Alert update failed:', e);
    }
  };

  // ── Incident handlers ─────────────────────────────────────────────────────────
  const handleIncidentCreate = async (formData) => {
    try {
      const created = await apiService.createIncident({
        title:       formData.title,
        description: formData.description || '',
        reporter:    user.id,
        status:      'open',
      });
      setRawIncidents((prev) => [created, ...prev]);
      return created;
    } catch (e) {
      console.error('Incident create failed:', e);
    }
  };

  const handleIncidentStatus = async (id, displayStatus) => {
    const backendStatus = serIncidentStatus(displayStatus);
    try {
      await apiService.updateIncident(id, { status: backendStatus });
      setRawIncidents((prev) =>
        prev.map((i) =>
          String(i.id) === String(id) ? { ...i, status: backendStatus } : i
        )
      );
    } catch (e) {
      console.error('Incident status update failed:', e);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (appLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: COLORS.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: COLORS.textSecondary, fontFamily: "'Inter', sans-serif",
      }}>
        Loading…
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const pages = {
    dashboard: (
      <DashboardPage
        alerts={alerts}
        workers={workers}
        zones={zones}
        onNavigate={setPage}
      />
    ),
    workers:   <WorkersPage   workers={workers} />,
    map:       <ZoneMapPage   workers={workers} zones={zones} />,
    alerts:    <AlertsPage    alerts={alerts}   onUpdateStatus={handleAlertStatus} />,
    incidents: (
      <IncidentsPage
        incidents={incidents}
        currentUser={user}
        onCreateIncident={handleIncidentCreate}
        onUpdateStatus={handleIncidentStatus}
      />
    ),
    analytics: <AnalyticsPage workers={workers} />,
    reports:   <ReportsPage   alerts={alerts} incidents={incidents} zones={zones} workers={workers} />,
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: COLORS.bg,
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      color: COLORS.textPrimary,
    }}>
      <Sidebar
        page={page}
        setPage={setPage}
        newAlertCount={newAlertCount}
        user={user}
        onSignOut={handleSignOut}
      />

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <TopBar page={page} newAlertCount={newAlertCount} />

        <div style={{ flex: 1, padding: 24 }}>
          {!dataReady && (
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 16 }}>
              Syncing with server…
            </div>
          )}
          {pages[page]}
        </div>
      </div>
    </div>
  );
}