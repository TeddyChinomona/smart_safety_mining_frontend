import { useState, useEffect } from "react";
import { COLORS } from "./utils/colors";
import { statusColor } from "./utils/statusHelpers";
import { StatCard, StatusBadge } from "./ui";

export function DashboardPage({ alerts, workers, zones = [], onNavigate }) {
  const activeAlerts   = alerts.filter((a) => a.status === "new");
  const dangerWorkers  = workers.filter((w) => w.status === "danger");
  const offlineWorkers = workers.filter((w) => w.status === "offline");

  const dangerZoneCount = zones.filter((z) => z.risk_level === "unsafe").length;

  // Simulated live environmental averages (replace with real aggregates when available)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const liveGas  = (12 + Math.sin(tick * 0.4) * 3).toFixed(1);
  const liveTemp = (28 + Math.cos(tick * 0.3) * 1.2).toFixed(1);

  return (
    <div>
      {dangerWorkers.length > 0 && (
        <div
          style={{
            background:   `linear-gradient(90deg, ${COLORS.dangerDim}, ${COLORS.surface})`,
            border:       `1px solid ${COLORS.danger}66`,
            borderRadius: 8,
            padding:      "12px 20px",
            marginBottom: 20,
            display:      "flex",
            alignItems:   "center",
            gap:          12,
          }}
        >
          <div
            style={{
              width: 10, height: 10,
              background: COLORS.danger, borderRadius: "50%",
              animation: "pulse 1.2s infinite",
            }}
          />
          <span style={{ color: COLORS.danger, fontWeight: 700, fontSize: 14 }}>
            ACTIVE EMERGENCY: {dangerWorkers.map((w) => w.name).join(", ")} require immediate attention
          </span>
          <button
            onClick={() => onNavigate("workers")}
            style={{
              marginLeft: "auto",
              background: COLORS.danger, border: "none",
              color: "#fff", borderRadius: 4,
              padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            View Workers
          </button>
        </div>
      )}

      {/* Stat row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Active Workers"
          value={workers.filter((w) => w.status !== "offline").length}
          sub={`${offlineWorkers.length} offline`}
        />
        <StatCard
          label="Live Alerts"
          value={activeAlerts.length}
          color={activeAlerts.length > 0 ? COLORS.danger : COLORS.safe}
          sub="requiring action"
        />
        <StatCard
          label="Unsafe Zones"
          value={dangerZoneCount}
          color={dangerZoneCount > 0 ? COLORS.danger : COLORS.safe}
          sub={`of ${zones.length} total zones`}
        />
        <StatCard
          label="Avg. Gas Level"
          value= "Use live"
          sub="ppm CH₄ (safe: <50)"
          color={parseFloat(liveGas) > 40 ? COLORS.warning : COLORS.safe}
        />
        <StatCard
          label="Avg. Temp"
          value="Use live"
          sub="ambient (safe: <32)"
          color={parseFloat(liveTemp) > 30 ? COLORS.warning : COLORS.safe}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Worker status list */}
        <div
          style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>Worker Status</div>
            <button
              onClick={() => onNavigate("workers")}
              style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 12, cursor: "pointer", fontWeight: 600 }}
            >
              View all
            </button>
          </div>

          {workers.length === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "30px 0" }}>
              No workers online: WebSocket data pending
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {workers.map((w) => (
                <div
                  key={w.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", background: COLORS.bg, borderRadius: 6,
                    border: `1px solid ${w.status === "danger" ? COLORS.danger + "44" : COLORS.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: statusColor(w.status), flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                    <div style={{ color: COLORS.textSecondary, fontSize: 11 }}>{w.role} · {w.zone}</div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent alerts */}
        <div
          style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>Recent Alerts</div>
            <button
              onClick={() => onNavigate("alerts")}
              style={{ background: "none", border: "none", color: COLORS.accent, fontSize: 12, cursor: "pointer", fontWeight: 600 }}
            >
              View all
            </button>
          </div>

          {alerts.length === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "30px 0" }}>
              No alerts yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "10px 12px", background: COLORS.bg,
                    borderRadius: 6, borderLeft: `3px solid ${statusColor(a.severity)}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{a.type}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <StatusBadge status={a.status} />
                      <span style={{ color: COLORS.textMuted, fontSize: 11, alignSelf: "center" }}>{a.time}</span>
                    </div>
                  </div>
                  <div style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {a.worker} · {a.zone}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </div>
  );
}