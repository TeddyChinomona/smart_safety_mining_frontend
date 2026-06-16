import { useState } from "react";
import { COLORS } from "./utils/colors";
import { statusColor, statusBg } from "./utils/statusHelpers";
import { StatusBadge } from "./ui";

const STATUS_OPTIONS = ["open", "under review", "resolved"];

const EMPTY_FORM = { title: "", description: "" };

const inputStyle = {
  width: "100%", background: COLORS.bg,
  border: `1px solid ${COLORS.border}`, borderRadius: 6,
  padding: "10px 14px", color: COLORS.textPrimary,
  fontSize: 13, outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", color: COLORS.textSecondary,
  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", marginBottom: 6,
};

export function IncidentsPage({ incidents, onCreateIncident, onUpdateStatus }) {
  const [showNew, setShowNew] = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [pending, setPending] = useState({});

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submitIncident = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onCreateIncident({ title: form.title.trim(), description: form.description });
    setForm(EMPTY_FORM);
    setShowNew(false);
    setSaving(false);
  };

  const updateStatus = async (id, newStatus) => {
    setPending((p) => ({ ...p, [id]: true }));
    await onUpdateStatus(id, newStatus);
    setPending((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16 }}>Incident Log</div>
        <button
          onClick={() => setShowNew(!showNew)}
          style={{
            background: COLORS.accent, border: "none", borderRadius: 6,
            padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          + New Incident
        </button>
      </div>

      {/* New incident form */}
      {showNew && (
        <div style={{
          background: COLORS.surface, border: `1px solid ${COLORS.accent}55`,
          borderRadius: 8, padding: 20, marginBottom: 20,
        }}>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            File New Incident Report
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Title</label>
              <input
                value={form.title}
                onChange={setField("title")}
                placeholder="Brief incident description"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={setField("description")}
                placeholder="Full details of the incident…"
                style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={submitIncident}
              disabled={saving}
              style={{
                background: saving ? COLORS.border : COLORS.accent,
                border: "none", borderRadius: 6, padding: "8px 20px",
                color: saving ? COLORS.textMuted : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Submitting…" : "Submit"}
            </button>
            <button
              onClick={() => { setShowNew(false); setForm(EMPTY_FORM); }}
              style={{
                background: "none", border: `1px solid ${COLORS.border}`,
                borderRadius: 6, padding: "8px 20px",
                color: COLORS.textSecondary, fontSize: 13, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Incident list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {incidents.map((inc) => (
          <div
            key={inc.id}
            style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: "16px 20px",
              opacity: pending[inc.id] ? 0.6 : 1, transition: "opacity 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15 }}>
                    {inc.title}
                  </span>
                  <StatusBadge status={inc.status} />
                </div>
                <div style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 }}>
                  {inc.worker} · {inc.zone} · {inc.date}
                </div>
                <div style={{ color: COLORS.textPrimary, fontSize: 13 }}>{inc.description}</div>

                {inc.linkedAlerts.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Linked alerts:</span>
                    {inc.linkedAlerts.map((a) => (
                      <span key={a} style={{
                        background: COLORS.accentDim, color: COLORS.accent,
                        fontSize: 11, padding: "1px 7px", borderRadius: 3, fontWeight: 700,
                      }}>
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status transition buttons */}
              <div style={{ display: "flex", gap: 8, marginLeft: 20 }}>
                {STATUS_OPTIONS.filter((s) => s !== inc.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(inc.id, s)}
                    disabled={!!pending[inc.id]}
                    style={{
                      background: statusBg(s), border: `1px solid ${statusColor(s)}55`,
                      borderRadius: 6, padding: "5px 12px",
                      color: statusColor(s), fontSize: 11, fontWeight: 700,
                      cursor: pending[inc.id] ? "not-allowed" : "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {incidents.length === 0 && (
          <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>
            No incidents reported yet.
          </div>
        )}
      </div>
    </div>
  );
}
