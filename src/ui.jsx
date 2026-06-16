import { COLORS } from "./utils/colors";
import { statusColor, statusBg } from "./utils/statusHelpers";

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status, size = "sm" }) {
  const pad = size === "sm" ? "2px 8px" : "4px 12px";
  const fs  = size === "sm" ? 11 : 13;
  return (
    <span
      style={{
        background:    statusBg(status),
        color:         statusColor(status),
        borderRadius:  4,
        padding:       pad,
        fontSize:      fs,
        fontWeight:    700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        display:       "inline-block",
        border:        `1px solid ${statusColor(status)}33`,
      }}
    >
      {status}
    </span>
  );
}

export function StatCard({ label, value, sub, color }) {
  return (
    <div
      style={{
        background:   COLORS.surface,
        border:       `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding:      "18px 22px",
        flex:         1,
      }}
    >
      <div
        style={{
          color:         COLORS.textMuted,
          fontSize:      11,
          fontWeight:    700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom:  6,
        }}
      >
        {label}
      </div>
      <div style={{ color: color || COLORS.textPrimary, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── GaugeBar ─────────────────────────────────────────────────────────────────

export function GaugeBar({ label, value, max, color, unit }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>{label}</span>
        <span style={{ color, fontSize: 12, fontWeight: 700 }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ height: 5, background: COLORS.border, borderRadius: 3 }}>
        <div
          style={{
            width:        `${pct}%`,
            height:       "100%",
            background:   color,
            borderRadius: 3,
            transition:   "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
