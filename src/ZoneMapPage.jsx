import { useState } from "react";
import { COLORS } from "./utils/colors";
import { statusColor, statusBg } from "./utils/statusHelpers";
import { StatusBadge } from "./ui";

// ─── ZoneMapPage ──────────────────────────────────────────────────────────────
// Props:
//   workers - built worker objects (include locationX, locationY)
//   zones   - raw zone objects from /api/zones/
//             Each zone has: { id, name, risk_level, coordinates }
//             coordinates = [[x,y], [x,y], ...] polygon points (same space as
//             SensorEvent.location_x / location_y used by the geofencing service)

// ── Helpers ───────────────────────────────────────────────────────────────────

const riskColor = (level) =>
  ({ safe: COLORS.safe, warning: COLORS.warning, unsafe: COLORS.danger }[level] ?? COLORS.offline);

// Normalise zone polygons + worker positions to a 0-100 SVG viewBox.
// Returns { svgZones, normPt } or null when there are no valid coordinates.
function buildLayout(apiZones) {
  const valid = apiZones.filter(
    (z) => Array.isArray(z.coordinates) && z.coordinates.length >= 3
  );
  if (valid.length === 0) return null;

  const allPts = valid.flatMap((z) => z.coordinates);
  const xs = allPts.map((p) => p[0]);
  const ys = allPts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = (maxX - minX) || 1;
  const rangeY = (maxY - minY) || 1;

  const PAD = 8, AREA = 84;

  const normPt = (x, y) => [
    PAD + ((x - minX) / rangeX) * AREA,
    PAD + ((y - minY) / rangeY) * AREA,
  ];

  const svgZones = valid.map((z) => {
    const cxs   = z.coordinates.map((p) => p[0]);
    const cys   = z.coordinates.map((p) => p[1]);
    const zMinX = Math.min(...cxs), zMaxX = Math.max(...cxs);
    const zMinY = Math.min(...cys), zMaxY = Math.max(...cys);
    const [nx,  ny]  = normPt(zMinX, zMinY);
    const [nx2, ny2] = normPt(zMaxX, zMaxY);
    return {
      id:   z.id,
      name: z.name,
      risk: z.risk_level,
      x: nx, y: ny,
      w: Math.max(nx2 - nx, 2),
      h: Math.max(ny2 - ny, 2),
    };
  });

  return { svgZones, normPt };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ZoneMapPage({ workers, zones = [] }) {
  const [hoveredZone,  setHoveredZone]  = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  const layout = buildLayout(zones);

  const workersInZone = (zoneName) => workers.filter((w) => w.zone === zoneName);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

      {/* ── SVG Map panel ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>Site Zone Map</div>
          <div style={{ display: "flex", gap: 16 }}>
            {[["safe", "Safe"], ["warning", "Warning"], ["unsafe", "Danger"]].map(([level, label]) => (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: riskColor(level) }} />
                <span style={{ color: COLORS.textSecondary, fontSize: 11 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative", background: COLORS.bg,
            borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}`,
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" style={{ display: "block" }}>
            {/* Grid */}
            {[20, 40, 60, 80].map((v) => (
              <g key={v}>
                <line x1="0" y1={v} x2="100" y2={v}   stroke={COLORS.border} strokeWidth="0.3" />
                <line x1={v} y1="0" x2={v}   y2="100" stroke={COLORS.border} strokeWidth="0.3" />
              </g>
            ))}

            {/* No-coordinates fallback */}
            {!layout && (
              <text
                x="50" y="50" textAnchor="middle" dominantBaseline="middle"
                fill={COLORS.textMuted} fontSize="4"
              >
                Configure zone coordinates to see the map
              </text>
            )}

            {/* Zone rectangles */}
            {layout && layout.svgZones.map((z) => {
              const c      = riskColor(z.risk);
              const isHov  = hoveredZone  === z.id;
              const isSel  = selectedZone === z.id;
              const isDash = z.risk === "unsafe";
              return (
                <g
                  key={z.id}
                  onMouseEnter={() => setHoveredZone(z.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => setSelectedZone(isSel ? null : z.id)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={z.x} y={z.y} width={z.w} height={z.h}
                    fill={`${c}${isHov || isSel ? "33" : "18"}`}
                    stroke={c}
                    strokeWidth={isSel ? "0.8" : "0.4"}
                    strokeDasharray={isDash ? "2,1" : "none"}
                    rx="1"
                  />
                  <text
                    x={z.x + z.w / 2} y={z.y + z.h / 2 - 2}
                    textAnchor="middle" fill={c} fontSize="3.5" fontWeight="700"
                  >
                    {z.name}
                  </text>
                </g>
              );
            })}

            {/* Worker dots */}
            {layout && workers.map((w) => {
              if (w.locationX == null || w.locationY == null) return null;
              const [cx, cy] = layout.normPt(w.locationX, w.locationY);
              const c = statusColor(w.status);
              return (
                <g key={w.id}>
                  <circle cx={cx} cy={cy} r="2" fill={c} opacity="0.9" />
                  {w.status === "danger" && (
                    <circle cx={cx} cy={cy} r="2" fill="none" stroke={c} strokeWidth="0.5">
                      <animate attributeName="r"       values="2;4;2"     dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <text x={cx + 2.5} y={cy + 1} fill={COLORS.textPrimary} fontSize="2" opacity="0.8">
                    {w.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}

            {/* Compass */}
            <text x="95" y="6" textAnchor="middle" fill={COLORS.textMuted} fontSize="3" fontWeight="700">N</text>
            <line x1="95" y1="7" x2="95" y2="10" stroke={COLORS.textMuted} strokeWidth="0.5" />
          </svg>
        </div>

        <div style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 11, textAlign: "center" }}>
          {layout
            ? "Dots show worker positions · Click a zone for details"
            : "Add zone coordinates via the API to enable the visual map"}
        </div>
      </div>

      {/* ── Side panel ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Zone list */}
        <div
          style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: 16,
          }}
        >
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            Zone Overview
          </div>

          {zones.length === 0 ? (
            <div style={{ color: COLORS.textMuted, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
              No zones configured
            </div>
          ) : (
            zones.map((z) => {
              const ww    = workersInZone(z.name);
              const c     = riskColor(z.risk_level);
              const isSel = selectedZone === z.id;
              return (
                <div
                  key={z.id}
                  onClick={() => setSelectedZone(isSel ? null : z.id)}
                  style={{
                    padding:      "10px 12px",
                    background:   isSel ? statusBg(z.risk_level === "unsafe" ? "danger" : z.risk_level) : COLORS.bg,
                    borderRadius: 6,
                    marginBottom: 6,
                    cursor:       "pointer",
                    border:       `1px solid ${isSel ? c + "66" : COLORS.border}`,
                    borderLeft:   `3px solid ${c}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{z.name}</span>
                    <StatusBadge status={z.risk_level === "unsafe" ? "danger" : z.risk_level} />
                  </div>
                  <div style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 3 }}>
                    {ww.length} worker{ww.length !== 1 ? "s" : ""} in zone
                  </div>

                  {isSel && ww.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {ww.map((worker) => (
                        <div key={worker.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div
                            style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: statusColor(worker.status),
                            }}
                          />
                          <span style={{ color: COLORS.textSecondary, fontSize: 11 }}>{worker.name}</span>
                          <StatusBadge status={worker.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div
          style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: 16,
          }}
        >
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            Zone Legend
          </div>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.8 }}>
            <div>🟢 <strong style={{ color: COLORS.textPrimary }}>Safe</strong> — Normal operations</div>
            <div>🟡 <strong style={{ color: COLORS.textPrimary }}>Warning</strong> — Elevated risk, monitor</div>
            <div>🔴 <strong style={{ color: COLORS.textPrimary }}>Unsafe</strong> — Restricted access</div>
            <div
              style={{
                marginTop: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10,
              }}
            >
              Pulsing dots indicate workers in emergency status.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}