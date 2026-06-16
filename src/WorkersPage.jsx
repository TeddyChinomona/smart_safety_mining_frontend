import { useState } from "react";
import { COLORS } from "./colors";
import { statusColor, statusBg } from "./statusHelpers";
import { StatusBadge, GaugeBar } from "./ui";

// ─── WorkersPage ──────────────────────────────────────────────────────────────

export function WorkersPage({ workers }) {
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState("all");

  const filtered = filter === "all" ? workers : workers.filter((w) => w.status === filter);
  const w        = selected ? workers.find((x) => x.id === selected) : null;

  const gasColor = w ? (w.gas  > 70  ? COLORS.danger : w.gas  > 40 ? COLORS.warning : COLORS.safe) : COLORS.safe;
  const tempColor = w ? (w.temp > 40  ? COLORS.danger : w.temp > 32 ? COLORS.warning : COLORS.safe) : COLORS.safe;
  const hrColor  = w ? (w.heartRate > 100 ? COLORS.danger : w.heartRate > 85 ? COLORS.warning : COLORS.safe) : COLORS.safe;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      {/* Worker list */}
      <div>
        {/* Filter bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["all", "safe", "warning", "danger", "offline"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background:    filter === f ? statusBg(f === "all" ? "safe" : f) : COLORS.surface,
                border:        `1px solid ${filter === f ? statusColor(f === "all" ? "safe" : f) : COLORS.border}`,
                borderRadius:  6,
                padding:       "6px 14px",
                color:         filter === f ? statusColor(f === "all" ? "safe" : f) : COLORS.textSecondary,
                fontSize:      12,
                fontWeight:    700,
                cursor:        "pointer",
                textTransform: "capitalize",
              }}
            >
              {f === "all" ? "All Workers" : f}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((worker) => (
            <div
              key={worker.id}
              onClick={() => setSelected(worker.id)}
              style={{
                background:   COLORS.surface,
                border:       `1px solid ${selected === worker.id ? statusColor(worker.status) + "88" : COLORS.border}`,
                borderRadius: 8,
                padding:      "16px 20px",
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                gap:          16,
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width:        12,
                  height:       12,
                  borderRadius: "50%",
                  background:   statusColor(worker.status),
                  flexShrink:   0,
                  boxShadow:    `0 0 8px ${statusColor(worker.status)}88`,
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>{worker.name}</span>
                  <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>{worker.id}</span>
                  {!worker.helmet && worker.status !== "offline" && (
                    <span
                      style={{
                        background:    COLORS.dangerDim,
                        color:         COLORS.danger,
                        fontSize:      10,
                        fontWeight:    700,
                        padding:       "1px 6px",
                        borderRadius:  3,
                        letterSpacing: "0.06em",
                      }}
                    >
                      NO HELMET
                    </span>
                  )}
                </div>
                <div style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 3 }}>
                  {worker.role} · {worker.zone}
                </div>
              </div>

              {/* Mini sensor strip */}
              {worker.status !== "offline" && (
                <div style={{ display: "flex", gap: 20, color: COLORS.textSecondary, fontSize: 12 }}>
                  <div>
                    <span style={{ color: worker.gas > 50 ? COLORS.danger : COLORS.textMuted }}>GAS </span>
                    <span style={{ color: worker.gas > 50 ? COLORS.danger : worker.gas > 30 ? COLORS.warning : COLORS.safe, fontWeight: 700 }}>
                      {worker.gas}ppm
                    </span>
                  </div>
                  <div>
                    <span style={{ color: COLORS.textMuted }}>TEMP </span>
                    <span style={{ color: worker.temp > 40 ? COLORS.danger : worker.temp > 32 ? COLORS.warning : COLORS.safe, fontWeight: 700 }}>
                      {worker.temp}°C
                    </span>
                  </div>
                  <div>
                    <span style={{ color: COLORS.textMuted }}>HR </span>
                    <span style={{ color: worker.heartRate > 100 ? COLORS.danger : worker.heartRate > 85 ? COLORS.warning : COLORS.safe, fontWeight: 700 }}>
                      {worker.heartRate}bpm
                    </span>
                  </div>
                </div>
              )}
              <StatusBadge status={worker.status} size="md" />
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div
        style={{
          background:   COLORS.surface,
          border:       `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding:      20,
          height:       "fit-content",
          position:     "sticky",
          top:          16,
        }}
      >
        {!w ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>
            Select a worker to view details
          </div>
        ) : (
          <>
            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div
                style={{
                  width:          44,
                  height:         44,
                  borderRadius:   "50%",
                  background:     statusBg(w.status),
                  border:         `2px solid ${statusColor(w.status)}`,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          statusColor(w.status),
                  fontWeight:     800,
                  fontSize:       16,
                }}
              >
                {w.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>{w.name}</div>
                <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{w.role}</div>
              </div>
            </div>

            {/* Meta fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {[["Worker ID", w.id], ["Zone", w.zone], ["Helmet", w.helmet ? "Worn ✓" : "⚠ Removed"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{k}</span>
                  <span
                    style={{
                      color:     k === "Helmet" && !w.helmet ? COLORS.danger : COLORS.textPrimary,
                      fontSize:  12,
                      fontWeight: 600,
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {w.status !== "offline" ? (
              <>
                <div
                  style={{
                    color:         COLORS.textSecondary,
                    fontSize:      11,
                    fontWeight:    700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom:  12,
                  }}
                >
                  Live Sensor Readings
                </div>
                <GaugeBar label="Gas (CH₄)"    value={w.gas}       max={100} color={gasColor}  unit="ppm" />
                <GaugeBar label="Temperature"   value={w.temp}      max={60}  color={tempColor} unit="°C"  />
                <GaugeBar label="Heart Rate"    value={w.heartRate} max={150} color={hrColor}   unit=" bpm" />
                <GaugeBar label="Humidity"      value={55}          max={100} color={COLORS.accent} unit="%" />

                <div style={{ marginTop: 20 }}>
                  <StatusBadge status={w.status} size="md" />
                </div>

                {w.status === "danger" && (
                  <button
                    style={{
                      marginTop:    12,
                      width:        "100%",
                      background:   COLORS.danger,
                      border:       "none",
                      borderRadius: 6,
                      padding:      "10px",
                      color:        "#fff",
                      fontSize:     13,
                      fontWeight:   700,
                      cursor:       "pointer",
                    }}
                  >
                    Dispatch Emergency Response
                  </button>
                )}
              </>
            ) : (
              <div
                style={{
                  background:   COLORS.offlineDim,
                  border:       `1px solid ${COLORS.offline}44`,
                  borderRadius: 6,
                  padding:      12,
                  color:        COLORS.offline,
                  fontSize:     13,
                  textAlign:    "center",
                }}
              >
                Device offline: No sensor data
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
