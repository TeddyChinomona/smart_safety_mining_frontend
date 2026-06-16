import { useState } from "react";
import { COLORS } from "./utils/colors";
import { statusColor, statusBg } from "./utils/statusHelpers";
import { StatusBadge } from "./ui";

export function AlertsPage({ alerts, onUpdateStatus }) {
  const [filter,         setFilter]         = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [pending,        setPending]        = useState({});

  const filtered = alerts.filter(
    (a) =>
      (filter         === "all" || a.status   === filter) &&
      (severityFilter === "all" || a.severity === severityFilter)
  );

  const updateStatus = async (id, newStatus) => {
    setPending((p) => ({ ...p, [id]: true }));
    await onUpdateStatus(id, newStatus);
    setPending((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  return (
    <div>
      {/* Filter row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        {/* Status filters */}
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "new", "acknowledged", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background:    filter === f ? (f === "all" ? COLORS.accentDim : statusBg(f)) : COLORS.surface,
                border:        `1px solid ${filter === f ? (f === "all" ? COLORS.accent : statusColor(f)) : COLORS.border}`,
                borderRadius:  6, padding: "6px 14px",
                color:         filter === f ? (f === "all" ? COLORS.accent : statusColor(f)) : COLORS.textSecondary,
                fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Severity filters */}
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "danger", "warning"].map((f) => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              style={{
                background:   severityFilter === f && f !== "all" ? statusBg(f) : COLORS.surface,
                border:       `1px solid ${severityFilter === f && f !== "all" ? statusColor(f) : COLORS.border}`,
                borderRadius: 6, padding: "6px 14px",
                color:        severityFilter === f && f !== "all" ? statusColor(f) : COLORS.textSecondary,
                fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
              }}
            >
              {f === "all" ? "All Severity" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((a) => (
          <div
            key={a.id}
            style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: "16px 20px",
              borderLeft: `4px solid ${statusColor(a.severity)}`,
              opacity: pending[a.id] ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>{a.type}</span>
                  <StatusBadge status={a.severity} />
                  <StatusBadge status={a.status} />
                </div>
                <div style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 }}>
                  {a.worker} · {a.zone} · {a.time}
                </div>
                <div style={{
                  color: COLORS.textPrimary, fontSize: 13,
                  background: COLORS.bg, padding: "8px 12px", borderRadius: 4,
                }}>
                  {a.message}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, marginLeft: 20 }}>
                {a.status === "new" && (
                  <button
                    onClick={() => updateStatus(a.id, "acknowledged")}
                    disabled={!!pending[a.id]}
                    style={{
                      background: COLORS.warningDim, border: `1px solid ${COLORS.warning}66`,
                      borderRadius: 6, padding: "6px 14px",
                      color: COLORS.warning, fontSize: 12, fontWeight: 700,
                      cursor: pending[a.id] ? "not-allowed" : "pointer",
                    }}
                  >
                    Acknowledge
                  </button>
                )}
                {a.status !== "resolved" && (
                  <button
                    onClick={() => updateStatus(a.id, "resolved")}
                    disabled={!!pending[a.id]}
                    style={{
                      background: COLORS.safeDim, border: `1px solid ${COLORS.safe}66`,
                      borderRadius: 6, padding: "6px 14px",
                      color: COLORS.safe, fontSize: 12, fontWeight: 700,
                      cursor: pending[a.id] ? "not-allowed" : "pointer",
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>
            No alerts match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
