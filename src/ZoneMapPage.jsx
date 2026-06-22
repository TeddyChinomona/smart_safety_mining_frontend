import { useState } from "react";
import { COLORS } from "./utils/colors";
import { statusColor, statusBg, fmtTime } from "./utils/statusHelpers";
import { StatusBadge } from "./ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

const riskColor = (level) =>
  ({ safe: COLORS.safe, warning: COLORS.warning, unsafe: COLORS.danger }[level] ?? COLORS.offline);

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
    const svgPts = z.coordinates.map(([cx, cy]) => normPt(cx, cy));
    // centroid for label
    const cx = svgPts.reduce((s, p) => s + p[0], 0) / svgPts.length;
    const cy = svgPts.reduce((s, p) => s + p[1], 0) / svgPts.length;
    return {
      id:     z.id,
      name:   z.name,
      risk:   z.risk_level,
      points: svgPts,   // [[x,y], …] in SVG viewBox space
      cx, cy,
    };
  });

  return { svgZones, normPt };
}

// ─── SessionsPanel ────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", background: COLORS.bg,
  border: `1px solid ${COLORS.border}`, borderRadius: 6,
  padding: "8px 10px", color: COLORS.textPrimary,
  fontSize: 12, outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", color: COLORS.textSecondary,
  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", marginBottom: 4,
};

function SessionsPanel({ zones, sessions, onStartSession, onEndSession }) {
  const [showForm,     setShowForm]     = useState(false);
  const [zoneChoice,   setZoneChoice]   = useState("");   // "existing-<id>" | "new"
  const [newZoneName,  setNewZoneName]  = useState("");
  const [sessionName,  setSessionName]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [ending,       setEnding]       = useState({});
  const [formError,    setFormError]    = useState("");

  const zoneName = (zoneId) => zones.find((z) => z.id === zoneId)?.name || `Zone ${zoneId}`;

  const handleSubmit = async () => {
    setFormError("");
    if (!zoneChoice) { setFormError("Select a zone or create a new one."); return; }
    if (!sessionName.trim()) { setFormError("Enter a session name."); return; }
    if (zoneChoice === "new" && !newZoneName.trim()) {
      setFormError("Enter a name for the new zone."); return;
    }

    setSubmitting(true);
    const existingId = zoneChoice.startsWith("existing-")
      ? parseInt(zoneChoice.split("-")[1], 10)
      : null;

    const result = await onStartSession(
      zoneChoice === "new" ? newZoneName.trim() : null,
      sessionName.trim(),
      existingId,
    );

    setSubmitting(false);
    if (result?.ok) {
      setShowForm(false);
      setZoneChoice(""); setNewZoneName(""); setSessionName("");
    } else {
      setFormError(result?.error || "Failed to start session.");
    }
  };

  const handleEnd = async (id) => {
    setEnding((e) => ({ ...e, [id]: true }));
    await onEndSession(id);
    setEnding((e) => { const n = { ...e }; delete n[id]; return n; });
  };

  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 8, padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>
          Mining Sessions
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(""); }}
          style={{
            background: showForm ? COLORS.border : COLORS.accentDim,
            border: `1px solid ${showForm ? COLORS.border : COLORS.accent}55`,
            borderRadius: 5, padding: "4px 10px",
            color: showForm ? COLORS.textMuted : COLORS.accent,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}
        >
          {showForm ? "✕ Cancel" : "+ New"}
        </button>
      </div>

      {/* Active session list */}
      {sessions.length === 0 && !showForm && (
        <div style={{
          color: COLORS.textMuted, fontSize: 11,
          textAlign: "center", padding: "12px 0",
        }}>
          No active sessions: start one to enable GPS fence tracking.
        </div>
      )}

      {sessions.map((s) => (
        <div
          key={s.id}
          style={{
            background: COLORS.bg, borderRadius: 6, padding: "8px 10px",
            marginBottom: 6,
            border: `1px solid ${COLORS.safe}33`,
            borderLeft: `3px solid ${COLORS.safe}`,
            opacity: ending[s.id] ? 0.5 : 1, transition: "opacity 0.2s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: COLORS.textPrimary, fontSize: 12, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {s.name}
              </div>
              <div style={{ color: COLORS.textSecondary, fontSize: 10, marginTop: 2 }}>
                {zoneName(s.zone)} · started {fmtTime(s.started_at)}
              </div>
            </div>
            <button
              onClick={() => handleEnd(s.id)}
              disabled={!!ending[s.id]}
              style={{
                background: COLORS.dangerDim, border: `1px solid ${COLORS.danger}55`,
                borderRadius: 4, padding: "3px 8px",
                color: COLORS.danger, fontSize: 10, fontWeight: 700,
                cursor: ending[s.id] ? "not-allowed" : "pointer",
                marginLeft: 8, flexShrink: 0,
              }}
            >
              End
            </button>
          </div>
        </div>
      ))}

      {/* New session form */}
      {showForm && (
        <div style={{
          marginTop: sessions.length ? 10 : 0,
          borderTop: sessions.length ? `1px solid ${COLORS.border}` : "none",
          paddingTop: sessions.length ? 10 : 0,
        }}>
          {formError && (
            <div style={{
              background: COLORS.dangerDim, border: `1px solid ${COLORS.danger}55`,
              borderRadius: 4, padding: "6px 10px",
              color: COLORS.danger, fontSize: 11, marginBottom: 10,
            }}>
              {formError}
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Zone</label>
            <select
              value={zoneChoice}
              onChange={(e) => setZoneChoice(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">select</option>
              {zones.map((z) => (
                <option key={z.id} value={`existing-${z.id}`}>{z.name}</option>
              ))}
              <option value="new">+ Create new zone</option>
            </select>
          </div>

          {zoneChoice === "new" && (
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>New Zone Name</label>
              <input
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="e.g. North Shaft"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Session Name</label>
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. Morning Shift A"
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting ? COLORS.border : COLORS.safe,
              border: "none", borderRadius: 6, padding: "8px",
              color: submitting ? COLORS.textMuted : "#000",
              fontSize: 12, fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Starting…" : "Start Session"}
          </button>
          <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 6, lineHeight: 1.4 }}>
            GPS sensors must use this session ID in simulate_gps.py to update the fence boundary.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ZoneMapPage({ workers, zones = [], sessions = [], onStartSession, onEndSession }) {
  const [hoveredZone,  setHoveredZone]  = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  const layout = buildLayout(zones);

  const workersInZone = (zoneName) => workers.filter((w) => w.zone === zoneName);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

      {/* ── SVG Map panel ─────────────────────────────────────────────────── */}
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>
            Site Zone Map
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {[["safe", "Safe"], ["warning", "Warning"], ["unsafe", "Danger"]].map(([level, label]) => (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: riskColor(level) }} />
                <span style={{ color: COLORS.textSecondary, fontSize: 11 }}>{label}</span>
              </div>
            ))}
            {/* Live indicator when a GPS session is active */}
            {sessions.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 6, height: 6, background: COLORS.safe, borderRadius: "50%",
                }} />
                <span style={{ color: COLORS.safe, fontSize: 10, fontWeight: 700 }}>
                  LIVE FENCE
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{
          position: "relative", background: COLORS.bg,
          borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}`,
        }}>
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
              <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
                fill={COLORS.textMuted} fontSize="3.5">
                Start a session and run simulate_gps.py
              </text>
            )}
            {!layout && (
              <text x="50" y="54" textAnchor="middle" dominantBaseline="middle"
                fill={COLORS.textMuted} fontSize="3">
                to see the live geofence boundary here
              </text>
            )}

            {/* Zone polygons: rendered from actual convex hull, not bounding boxes */}
            {layout && layout.svgZones.map((z) => {
              const c      = riskColor(z.risk);
              const isHov  = hoveredZone  === z.id;
              const isSel  = selectedZone === z.id;
              const isDash = z.risk === "unsafe";
              const ptStr  = z.points.map((p) => p.join(",")).join(" ");
              return (
                <g
                  key={z.id}
                  onMouseEnter={() => setHoveredZone(z.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => setSelectedZone(isSel ? null : z.id)}
                  style={{ cursor: "pointer" }}
                >
                  <polygon
                    points={ptStr}
                    fill={`${c}${isHov || isSel ? "33" : "18"}`}
                    stroke={c}
                    strokeWidth={isSel ? "0.8" : "0.4"}
                    strokeDasharray={isDash ? "2,1" : "none"}
                  />
                  <text
                    x={z.cx} y={z.cy}
                    textAnchor="middle" fill={c} fontSize="3.5" fontWeight="700"
                  >
                    {z.name}
                  </text>
                </g>
              );
            })}

            {/* Worker dots: position from nearest GPS sensor's last fix */}
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
            ? `Polygon hull from GPS readings · ${sessions.length > 0 ? "updates every 3 s" : "static"} · click a zone for details`
            : "Start a session and run simulate_gps.py to populate the live fence boundary"}
        </div>
      </div>

      {/* ── Side panel ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Session management */}
        <SessionsPanel
          zones={zones}
          sessions={sessions}
          onStartSession={onStartSession}
          onEndSession={onEndSession}
        />

        {/* Zone list */}
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: 16,
        }}>
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
              const hasCoords = Array.isArray(z.coordinates) && z.coordinates.length >= 3;
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
                    {hasCoords && (
                      <span style={{ color: COLORS.safe, marginLeft: 6 }}>· fence active</span>
                    )}
                  </div>

                  {isSel && ww.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {ww.map((worker) => (
                        <div key={worker.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: statusColor(worker.status),
                          }} />
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
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: 16,
        }}>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            Zone Legend
          </div>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.8 }}>
            <div><strong style={{ color: COLORS.textPrimary }}>Safe</strong>Normal operations</div>
            <div><strong style={{ color: COLORS.textPrimary }}>Warning</strong>Elevated risk, monitor</div>
            <div><strong style={{ color: COLORS.textPrimary }}>Unsafe</strong>Restricted access</div>
            <div style={{
              marginTop: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10,
            }}>
              Polygon boundary is the convex hull of all active GPS sensor readings for the session.
              Pulsing dots indicate workers in emergency status.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}