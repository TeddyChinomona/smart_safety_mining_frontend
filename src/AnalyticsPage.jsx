import { useState, useEffect, useRef } from "react";
import { COLORS } from "./utils/colors";
import { statusColor } from "./utils/statusHelpers";
import { StatusBadge } from "./ui";

const HISTORY_SIZE = 20;

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color, height = 60 }) {
  if (!data || data.length < 2) {
    return (
      <svg viewBox={`0 0 200 ${height}`} width="100%" height={height} style={{ display: "block" }}>
        <line
          x1="0" y1={height / 2} x2="200" y2={height / 2}
          stroke={color} strokeWidth="1" strokeDasharray="4,4" opacity="0.3"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) =>
      `${(i / (data.length - 1)) * 200},${
        height - ((v - min) / (max - min + 0.01)) * (height - 10) - 5
      }`
    )
    .join(" ");

  return (
    <svg viewBox={`0 0 200 ${height}`} width="100%" height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <polyline
        points={`0,${height} ${pts} 200,${height}`}
        fill={`${color}15`} stroke="none"
      />
    </svg>
  );
}

// ─── AnalyticsPage ────────────────────────────────────────────────────────────

export function AnalyticsPage({ workers = [] }) {
  const [tick, setTick] = useState(0);
  // Rolling history stored in a ref so we never re-render just to push a value
  const hist = useRef({ gas: [], temp: [], hr: [] });

  // Sample fleet averages every 2 s and append to history
  useEffect(() => {
    const t = setInterval(() => {
      const active = workers.filter((w) => w.status !== "offline");
      if (active.length > 0) {
        const avg  = (key) => active.reduce((s, w) => s + (w[key] || 0), 0) / active.length;
        const push = (arr, v) => [...arr.slice(-(HISTORY_SIZE - 1)), parseFloat(v.toFixed(2))];
        hist.current.gas  = push(hist.current.gas,  avg("gas"));
        hist.current.temp = push(hist.current.temp, avg("temp"));
        hist.current.hr   = push(hist.current.hr,   avg("heartRate"));
      }
      setTick((p) => p + 1);
    }, 2000);
    return () => clearInterval(t);
  }, [workers]);

  const last    = (arr) => arr.length > 0 ? arr[arr.length - 1] : null;
  const display = (v, dec = 1) => (v != null ? v.toFixed(dec) : "—");

  const { gas: gasH, temp: tempH, hr: hrH } = hist.current;

  const streams = [
    {
      label:   "Fleet Avg — Gas (CH₄)",
      data:    gasH,
      color:   COLORS.danger,
      current: display(last(gasH)),
      unit:    "ppm",
    },
    {
      label:   "Fleet Avg — Temperature",
      data:    tempH,
      color:   COLORS.warning,
      current: display(last(tempH)),
      unit:    "°C",
    },
    {
      label:   "Fleet Avg — Heart Rate",
      data:    hrH,
      color:   COLORS.accent,
      current: last(hrH) != null ? String(Math.round(last(hrH))) : "—",
      unit:    "bpm",
    },
  ];

  // ── Derive AI patterns from live worker data ──────────────────────────────
  const aiPatterns = [];
  workers.forEach((w) => {
    if (w.status === "offline") return;

    if (w.status === "danger") {
      const details = [
        w.gas       > 8   && `gas ${w.gas} ppm`,
        w.temp      > 40  && `temp ${w.temp}°C`,
        w.heartRate > 120 && `HR ${w.heartRate} bpm`,
      ].filter(Boolean).join(", ");

      aiPatterns.push({
        label:    `Critical Risk: ${w.name}`,
        severity: "danger",
        insight:  `Decision-tree classifier flagged abnormal vitals${
          details ? ` — ${details}` : ""
        }. Supervisor dispatch required.`,
        zone: w.zone,
      });
      return; // one pattern per worker
    }

    if (!w.helmet) {
      aiPatterns.push({
        label:    `PPE Violation: ${w.name}`,
        severity: "warning",
        insight:  `Helmet sensor reports PPE removed in zone ${w.zone}. Compliance action required.`,
        zone: w.zone,
      });
      return;
    }

    if (w.status === "warning" || w.gas > 5 || w.temp > 35) {
      aiPatterns.push({
        label:    `Elevated Reading: ${w.name}`,
        severity: "warning",
        insight:  `Readings above baseline — gas ${w.gas} ppm, temp ${w.temp}°C, HR ${w.heartRate} bpm. Monitor closely.`,
        zone: w.zone,
      });
    }
  });

  const noLiveData = workers.length === 0 || workers.every((w) => w.status === "offline");

  return (
    <div>
      {/* No-data banner */}
      {noLiveData && (
        <div
          style={{
            background:   COLORS.warningDim,
            border:       `1px solid ${COLORS.warning}55`,
            borderRadius: 6,
            padding:      "8px 14px",
            color:        COLORS.warning,
            fontSize:     12,
            marginBottom: 16,
          }}
        >
          Awaiting WebSocket data — sparklines populate once workers come online.
        </div>
      )}

      {/* ── Live sparkline cards ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        {streams.map((s) => (
          <div
            key={s.label}
            style={{
              background:   COLORS.surface,
              border:       `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding:      16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span
                style={{
                  color:         COLORS.textSecondary,
                  fontSize:      11,
                  fontWeight:    700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {s.label}
              </span>
              <span style={{ color: s.color, fontSize: 18, fontWeight: 800 }}>
                {s.current}
                {s.current !== "—" && (
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>{s.unit}</span>
                )}
              </span>
            </div>
            <Sparkline data={s.data} color={s.color} />
            <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 4 }}>
              {s.data.length > 0
                ? `Live · ${s.data.length} samples · fleet average`
                : "Waiting for sensor data…"}
            </div>
          </div>
        ))}
      </div>

      {/* ── Per-worker sensor strip ──────────────────────────────────────────── */}
      {workers.some((w) => w.status !== "offline") && (
        <div
          style={{
            background:   COLORS.surface,
            border:       `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding:      20,
            marginBottom: 20,
          }}
        >
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            Live Sensor Readings — All Workers
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {workers.filter((w) => w.status !== "offline").map((w) => (
              <div
                key={w.id}
                style={{
                  background:   COLORS.bg,
                  border:       `1px solid ${statusColor(w.status)}33`,
                  borderLeft:   `3px solid ${statusColor(w.status)}`,
                  borderRadius: 6,
                  padding:      "10px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{w.name}</span>
                  <StatusBadge status={w.status} />
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <div>
                    <span style={{ color: COLORS.textMuted }}>GAS </span>
                    <span style={{ color: w.gas > 8 ? COLORS.danger : w.gas > 4 ? COLORS.warning : COLORS.safe, fontWeight: 700 }}>
                      {w.gas} ppm
                    </span>
                  </div>
                  <div>
                    <span style={{ color: COLORS.textMuted }}>TEMP </span>
                    <span style={{ color: w.temp > 40 ? COLORS.danger : w.temp > 32 ? COLORS.warning : COLORS.safe, fontWeight: 700 }}>
                      {w.temp}°C
                    </span>
                  </div>
                  <div>
                    <span style={{ color: COLORS.textMuted }}>HR </span>
                    <span style={{ color: w.heartRate > 120 ? COLORS.danger : w.heartRate > 100 ? COLORS.warning : COLORS.safe, fontWeight: 700 }}>
                      {w.heartRate} bpm
                    </span>
                  </div>
                </div>
                {!w.helmet && (
                  <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 11, fontWeight: 700 }}>
                    ⚠ Helmet not worn
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Pattern Detection ─────────────────────────────────────────────── */}
      <div
        style={{
          background:   COLORS.surface,
          border:       `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding:      20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 28, height: 28,
              background: COLORS.accentDim, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}
          >
            🧠
          </div>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>
            AI Pattern Detection
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, background: COLORS.safe, borderRadius: "50%" }} />
            <span style={{ color: COLORS.safe, fontSize: 11, fontWeight: 700 }}>MODEL ACTIVE</span>
          </div>
        </div>

        {aiPatterns.length === 0 ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            {noLiveData
              ? "No sensor data — patterns will appear once workers come online."
              : "No anomalies detected — all workers within normal parameters."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aiPatterns.map((p, i) => (
              <div
                key={i}
                style={{
                  background:   COLORS.bg,
                  border:       `1px solid ${statusColor(p.severity)}33`,
                  borderLeft:   `3px solid ${statusColor(p.severity)}`,
                  borderRadius: 6,
                  padding:      "12px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>
                    {p.label}
                  </span>
                  <StatusBadge status={p.severity} />
                  <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: "auto" }}>
                    {p.zone} · live
                  </span>
                </div>
                <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{p.insight}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}