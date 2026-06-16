import api from '../api';

export const apiService = {
  // ─── Zones ──────────────────────────────────────────────────────────────────
  getZones: () => api.get('/api/zones/').then((r) => r.data),

  // ─── Alerts ─────────────────────────────────────────────────────────────────
  getAlerts:   ()           => api.get('/api/alerts/').then((r) => r.data),
  updateAlert: (id, payload) => api.patch(`/api/alerts/${id}/`, payload).then((r) => r.data),

  // ─── Incidents ──────────────────────────────────────────────────────────────
  getIncidents:    ()              => api.get('/api/incidents/').then((r) => r.data),
  createIncident:  (payload)       => api.post('/api/incidents/', payload).then((r) => r.data),
  updateIncident:  (id, payload)   => api.patch(`/api/incidents/${id}/`, payload).then((r) => r.data),

  // ─── Analytics ──────────────────────────────────────────────────────────────
  getSummary: () => api.get('/api/analytics/summary/').then((r) => r.data),

  // Triggers a CSV download directly in the browser
  exportCsv: async () => {
    const res = await api.get('/api/analytics/export_csv/', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'safety_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
