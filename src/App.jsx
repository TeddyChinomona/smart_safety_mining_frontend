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
  const [users,        setUsers]        = useState([]);
  const [rawAlerts,    setRawAlerts]    = useState([]);
  const [rawIncidents, setRawIncidents] = useState([]);
  const [zones,        setZones]        = useState([]);
  const [sessions,     setSessions]     = useState([]); 
  const [gpsSensors,   setGpsSensors]   = useState([]);

  const [statusMap, setStatusMap] = useState({});
  const [sensorMap, setSensorMap] = useState({});

  
  const userMapRef = useRef({});
  const gpsMapRef  = useRef({});

  const alerts    = rawAlerts.map((a) => transformAlert(a, userMapRef.current));
  const incidents = rawIncidents.map((i) => transformIncident(i, userMapRef.current));
  const workers   = buildWorkers(users, statusMap, sensorMap, zones, gpsMapRef.current);

  const newAlertCount = alerts.filter((a) => a.status === 'new').length;

  // ── Initial data load
  const loadData = useCallback(async () => {
    try {
      const [
        workersData,
        allUsersData,
        alertsData,
        incidentsData,
        zonesData,
        sessionsData,
        gpsSensorsData,
      ] = await Promise.all([
        authService.getUsers(),
        authService.getAllUsers().catch(() => null),
        apiService.getAlerts(),
        apiService.getIncidents(),
        apiService.getZones(),
        apiService.getActiveSessions().catch(() => []),
        // GPS sensors: 403 for workers: fall back gracefully to empty list
        apiService.getGpsSensors().catch(() => []),
      ]);

      userMapRef.current = buildUserMap(allUsersData ?? workersData);
      gpsMapRef.current  = Object.fromEntries(gpsSensorsData.map((g) => [g.id, g]));

      setUsers(workersData);
      setRawAlerts(alertsData);
      setRawIncidents(incidentsData);
      setZones(zonesData);
      setSessions(sessionsData);
      setGpsSensors(gpsSensorsData);
    } catch (e) {
      console.error('Initial data load failed:', e);
    } finally {
      setDataReady(true);
    }
  }, []);

  // WebSocket handlers
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

  
  const handleZone = useCallback((msg) => {
    if (msg.type === 'initial_data') {
      setZones(msg.data);
    } else if (msg.type === 'zone_update') {
      setZones((prev) =>
        prev.map((z) => (z.id === msg.data.id ? msg.data : z))
      );
    }
  }, []);

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

  useEffect(() => {
    const handler = () => {
      setUser(null);
      wsService.disconnect();
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
    wsService.connect(handleSensor, handleWorker, handleZone);
    return () => wsService.disconnect();
  }, [user, loadData, handleSensor, handleWorker, handleZone]);

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
    setSessions([]); setGpsSensors([]);
    setStatusMap({}); setSensorMap({});
    setDataReady(false);
    userMapRef.current = {};
    gpsMapRef.current  = {};
  };

  
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

  
  const handleStartSession = async (newZoneName, sessionName, existingZoneId) => {
    try {
      let zoneId = existingZoneId;

      if (!zoneId) {
        // Create a fresh zone
        const newZone = await apiService.createZone({
          name:       newZoneName,
          risk_level: 'safe',
          coordinates: [],
        });
        setZones((prev) => [...prev, newZone]);
        zoneId = newZone.id;
      }

      const session = await apiService.startSession({ zone: zoneId, name: sessionName });
      setSessions((prev) => [...prev, session]);
      return { ok: true, session };
    } catch (e) {
      const msg = e.response?.data
        ? JSON.stringify(e.response.data)
        : e.message;
      console.error('Start session failed:', msg);
      return { ok: false, error: msg };
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      await apiService.endSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e) {
      console.error('End session failed:', e);
    }
  };

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
    map: (
      <ZoneMapPage
        workers={workers}
        zones={zones}
        sessions={sessions}
        onStartSession={handleStartSession}
        onEndSession={handleEndSession}
      />
    ),
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