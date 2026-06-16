import { COLORS } from "../utils/colors";

// ─── Status Helpers ───────────────────────────────────────────────────────────

export const statusColor = (s) =>
  ({
    safe:           COLORS.safe,
    warning:        COLORS.warning,
    danger:         COLORS.danger,
    new:            COLORS.danger,
    "under review": COLORS.warning,
    resolved:       COLORS.safe,
    open:           COLORS.danger,
    offline:        COLORS.offline,
    acknowledged:   COLORS.warning,
  }[s] || COLORS.textSecondary);

export const statusBg = (s) =>
  ({
    safe:           COLORS.safeDim,
    warning:        COLORS.warningDim,
    danger:         COLORS.dangerDim,
    new:            COLORS.dangerDim,
    "under review": COLORS.warningDim,
    resolved:       COLORS.safeDim,
    open:           COLORS.dangerDim,
    offline:        COLORS.offlineDim,
    acknowledged:   COLORS.warningDim,
  }[s] || COLORS.offlineDim);

// ─── Time Helpers ─────────────────────────────────────────────────────────────

export const fmtTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
