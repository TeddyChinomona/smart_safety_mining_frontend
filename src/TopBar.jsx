import { COLORS } from "./utils/colors";
import { NAV_ITEMS } from "./utils/navigation";

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ page, newAlertCount }) {
  const pageLabel = NAV_ITEMS.find((n) => n.id === page)?.label ?? "";

  return (
    <div
      style={{
        padding:         "16px 28px",
        borderBottom:    `1px solid ${COLORS.border}`,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        background:      COLORS.surface,
        flexShrink:      0,
      }}
    >
      <div>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 18 }}>
          {pageLabel}
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 1 }}>
          Simba Shaft · Shift 1 ·{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month:   "short",
            day:     "numeric",
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {newAlertCount > 0 && (
          <div
            style={{
              background:   COLORS.dangerDim,
              border:       `1px solid ${COLORS.danger}55`,
              borderRadius: 6,
              padding:      "5px 12px",
              display:      "flex",
              alignItems:   "center",
              gap:          6,
            }}
          >
            <div style={{ width: 7, height: 7, background: COLORS.danger, borderRadius: "50%" }} />
            <span style={{ color: COLORS.danger, fontSize: 12, fontWeight: 700 }}>
              {newAlertCount} unresolved alerts
            </span>
          </div>
        )}
        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>v1.0.0 Prototype</div>
      </div>
    </div>
  );
}
