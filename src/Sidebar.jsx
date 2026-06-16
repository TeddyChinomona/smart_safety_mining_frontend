import { COLORS } from "./utils/colors";
import { NAV_ITEMS } from "./utils/navigation";

export function Sidebar({ page, setPage, newAlertCount, user, onSignOut }) {
  return (
    <div
      style={{
        width:         220,
        background:    COLORS.surface,
        borderRight:   `1px solid ${COLORS.border}`,
        display:       "flex",
        flexDirection: "column",
        flexShrink:    0,
      }}
    >
      {/* Branding */}
      <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width:          32,
              height:         32,
              background:     COLORS.warning,
              borderRadius:   7,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div style={{ color: COLORS.textPrimary, fontWeight: 800, fontSize: 13, letterSpacing: "-0.01em" }}>
              Smart Mining
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Safety Monitor
            </div>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div
        style={{
          padding:       "10px 16px",
          borderBottom:  `1px solid ${COLORS.border}`,
          display:       "flex",
          alignItems:    "center",
          gap:           7,
        }}
      >
        <div style={{ width: 7, height: 7, background: COLORS.safe, borderRadius: "50%" }} />
        <span style={{ color: COLORS.safe, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
          LIVE MONITORING
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            10,
              width:          "100%",
              padding:        "9px 12px",
              background:     page === item.id ? COLORS.accentDim : "none",
              border:         "none",
              borderRadius:   6,
              color:          page === item.id ? COLORS.accent : COLORS.textSecondary,
              fontSize:       13,
              fontWeight:     page === item.id ? 700 : 500,
              cursor:         "pointer",
              textAlign:      "left",
              marginBottom:   2,
              position:       "relative",
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.id === "alerts" && newAlertCount > 0 && (
              <span
                style={{
                  marginLeft:  "auto",
                  background:  COLORS.danger,
                  color:       "#fff",
                  borderRadius: 10,
                  fontSize:    10,
                  fontWeight:  800,
                  padding:     "1px 7px",
                  minWidth:    18,
                  textAlign:   "center",
                }}
              >
                {newAlertCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User info + sign out */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width:          30,
              height:         30,
              background:     COLORS.accentDim,
              border:         `1px solid ${COLORS.accent}55`,
              borderRadius:   "50%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              color:          COLORS.accent,
              fontWeight:     700,
              fontSize:       12,
              flexShrink:     0,
            }}
          >
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color:         COLORS.textPrimary,
                fontSize:      12,
                fontWeight:    600,
                whiteSpace:    "nowrap",
                overflow:      "hidden",
                textOverflow:  "ellipsis",
              }}
            >
              {user.email}
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 10 }}>{user.name}</div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            marginTop:    10,
            width:        "100%",
            background:   "none",
            border:       `1px solid ${COLORS.border}`,
            borderRadius: 5,
            padding:      "6px",
            color:        COLORS.textMuted,
            fontSize:     11,
            cursor:       "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
