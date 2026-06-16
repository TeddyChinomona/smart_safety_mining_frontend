import { useState, useEffect } from "react";
import { COLORS } from "./utils/colors";
import { statusColor } from "./utils/statusHelpers";
import { StatusBadge } from "./ui";

const AI_PATTERNS = [
  
];

function Sparkline({ data, color, height = 60 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * 200},${
          height - ((v - min) / (max - min + 0.01)) * (height - 10) - 5
        }`
    )
    .join(" ");

  return (
    <svg viewBox={`0 0 200 ${height}`} width="100%" height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <polyline points={`0,${height} ${pts} 200,${height}`} fill={`${color}15`} stroke="none" />
    </svg>
  );
}

export function AnalyticsPage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const gasHistory  = Array.from({ length: 20 }, (_, i) => 35 + Math.sin(i * 0.5 + tick * 0.3) * 15 + Math.random() * 5);
  const tempHistory = Array.from({ length: 20 }, (_, i) => 30 + Math.cos(i * 0.4 + tick * 0.2) * 5);
  const hrHistory   = Array.from({ length: 20 }, (_, i) => 78 + Math.sin(i * 0.7 + tick * 0.4) * 18);

  const streams = [
    { label: "Gas (Zone C)",       data: gasHistory,  color: COLORS.danger,  current: gasHistory[gasHistory.length   - 1].toFixed(1), unit: "ppm" },
    { label: "Temperature (Zone B)", data: tempHistory, color: COLORS.warning, current: tempHistory[tempHistory.length - 1].toFixed(1), unit: "°C"  },
    { label: "Heart Rate (W003)",  data: hrHistory,   color: COLORS.accent,  current: hrHistory[hrHistory.length     - 1].toFixed(0), unit: "bpm" },
  ];

  return (
    <div>
      {/* Live sparkline cards */}
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
                <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>{s.unit}</span>
              </span>
            </div>
            <Sparkline data={s.data} color={s.color} />
            <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 4 }}>Live — last 20 readings</div>
          </div>
        ))}
      </div>

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
              width:          28,
              height:         28,
              background:     COLORS.accentDim,
              borderRadius:   6,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       14,
            }}
          >
          
          </div>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>AI Pattern Detection</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, background: COLORS.safe, borderRadius: "50%" }} />
            <span style={{ color: COLORS.safe, fontSize: 11, fontWeight: 700 }}>MODEL ACTIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {AI_PATTERNS.map((p, i) => (
            <div
              key={i}
              style={{
                background:   COLORS.bg,
                border:       `1px solid ${statusColor(p.severity)}33`,
                borderRadius: 6,
                padding:      "12px 16px",
                borderLeft:   `3px solid ${statusColor(p.severity)}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                <StatusBadge status={p.severity} />
                <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: "auto" }}>{p.time}</span>
              </div>
              <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{p.insight}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
