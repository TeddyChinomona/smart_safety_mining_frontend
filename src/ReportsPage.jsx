import { useState, useEffect, useMemo } from "react";
import { COLORS } from "./utils/colors";
import { apiService } from "./services/apiService";
import { StatCard } from "./ui";

const MAX_BAR = 8;

/** Return the last `n` calendar days as { day, start, end } objects. */
function lastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return {
      day:   d.toLocaleDateString("en-US", { weekday: "short" }),
      start,
      end:   start + 86_400_000,
    };
  });
}

const riskScore   = { safe: 10, warning: 50, unsafe: 90 };
const workerScore = (status) =>
  ({ danger: 90, warning: 55, safe: 15, offline: 5 }[status] ?? 5);

export function ReportsPage({ alerts = [], incidents = [], zones = [], workers = [] }) {
  const [summary,    setSummary]    = useState(null);
  const [exporting,  setExporting]  = useState(false);
  const [summaryErr, setSummaryErr] = useState(false);

  useEffect(() => {
    apiService.getSummary()
      .then(setSummary)
      .catch(() => setSummaryErr(true));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await apiService.exportCsv();
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /** Alerts grouped by day for the last 7 days */
  const alertsByDay = useMemo(() => {
    const days = lastNDays(7);
    return days.map(({ day, start, end }) => {
      const bucket = alerts.filter((a) => a.timestamp >= start && a.timestamp < end);
      return {
        day,
        danger:  bucket.filter((a) => a.severity === "danger").length,
        warning: bucket.filter((a) => a.severity === "warning").length,
      };
    });
  }, [alerts]);

  /** Risk score per zone derived from zone.risk_level */
  const riskByZone = useMemo(
    () =>
      zones
        .map((z) => ({ zone: z.name, score: riskScore[z.risk_level] ?? 10 }))
        .sort((a, b) => b.score - a.score),
    [zones],
  );

  /** Top 6 workers ranked by derived risk score */
  const workerRisk = useMemo(
    () =>
      workers
        .map((w) => ({ name: w.name, score: workerScore(w.status) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [workers],
  );

  // ── Summary counts ──────────────────────────────────────────────────────────
  const totalAlerts   = summary?.total_alerts   ?? alerts.length;
  const openIncidents = summary?.open_incidents ?? incidents.filter((i) => i.status === "open").length;
  const dangerAlerts  = alerts.filter((a) => a.severity === "danger").length;
  const unsafeZones   = zones.filter((z) => z.risk_level === "unsafe").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16 }}>Safety Analytics Report</div>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            background: exporting ? COLORS.border : COLORS.surface,
            border:     `1px solid ${COLORS.border}`,
            borderRadius: 6,
            padding:    "8px 18px",
            color:      exporting ? COLORS.textMuted : COLORS.textSecondary,
            fontSize:   13,
            cursor:     exporting ? "not-allowed" : "pointer",
          }}
        >
          {exporting ? "Exporting…" : "↓ Export CSV"}
        </button>
      </div>

      {summaryErr && (
        <div style={{
          background: COLORS.warningDim, border: `1px solid ${COLORS.warning}55`,
          borderRadius: 6, padding: "8px 14px",
          color: COLORS.warning, fontSize: 12, marginBottom: 16,
        }}>
          Could not reach analytics endpoint: showing live counts from this session.
        </div>
      )}

      {/* Summary stat row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Alerts"   value={totalAlerts}   color={COLORS.danger}  sub={`${dangerAlerts} danger`} />
        <StatCard label="Open Incidents" value={openIncidents} color={COLORS.warning} sub="requiring action" />
        <StatCard label="Unsafe Zones"   value={unsafeZones}   color={COLORS.danger}  sub={`of ${zones.length} configured`} />
        <StatCard
          label="Danger Workers"
          value={workers.filter((w) => w.status === "danger").length}
          color={COLORS.warning}
          sub="AI-ranked"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Alerts by day */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 20 }}>
            Alerts by Day (Last 7 Days)
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 140 }}>
            {alertsByDay.map((d) => (
              <div
                key={d.day}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end",
                }}
              >
                {d.danger > 0 && (
                  <div style={{
                    width: "100%", height: `${(d.danger / MAX_BAR) * 100}%`,
                    background: COLORS.danger, borderRadius: "2px 2px 0 0", minHeight: 4,
                  }} />
                )}
                {d.warning > 0 && (
                  <div style={{
                    width: "100%", height: `${(d.warning / MAX_BAR) * 100}%`,
                    background: COLORS.warning, borderRadius: "2px 2px 0 0", minHeight: 4,
                  }} />
                )}
                {d.danger === 0 && d.warning === 0 && (
                  <div style={{ width: "100%", height: 4, background: COLORS.border, borderRadius: 2 }} />
                )}
                <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 6 }}>{d.day}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {[["Danger", COLORS.danger], ["Warning", COLORS.warning]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
                <span style={{ color: COLORS.textSecondary, fontSize: 11 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk score by zone */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
            Risk Score by Zone
          </div>

          {riskByZone.length === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: 12, textAlign: "center", padding: "30px 0" }}>
              No zones configured
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {riskByZone.map((z) => {
                const color = z.score >= 80 ? COLORS.danger : z.score >= 40 ? COLORS.warning : COLORS.safe;
                return (
                  <div key={z.zone}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: COLORS.textPrimary, fontSize: 13 }}>{z.zone}</span>
                      <span style={{ color, fontSize: 13, fontWeight: 700 }}>
                        {z.score}<span style={{ color: COLORS.textMuted, fontWeight: 400 }}>/100</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: COLORS.border, borderRadius: 4 }}>
                      <div style={{
                        width: `${z.score}%`, height: "100%",
                        background: `linear-gradient(90deg, ${color}88, ${color})`,
                        borderRadius: 4, transition: "width 0.5s",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Worker risk ranking */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
          Worker Risk Ranking (Status-Based)
        </div>

        {workerRisk.length === 0 ? (
          <div style={{ color: COLORS.textMuted, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
            No worker data: WebSocket data pending
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {workerRisk.map((w) => {
              const color = w.score >= 80 ? COLORS.danger : w.score >= 40 ? COLORS.warning : COLORS.safe;
              return (
                <div
                  key={w.name}
                  style={{
                    background:   COLORS.bg,
                    border:       `1px solid ${color}33`,
                    borderRadius: 6,
                    padding:      "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{w.name}</span>
                    <span style={{ color, fontSize: 20, fontWeight: 800 }}>{w.score}</span>
                  </div>
                  <div style={{ height: 4, background: COLORS.border, borderRadius: 2 }}>
                    <div style={{ width: `${w.score}%`, height: "100%", background: color, borderRadius: 2 }} />
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 4 }}>Risk index / 100</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}