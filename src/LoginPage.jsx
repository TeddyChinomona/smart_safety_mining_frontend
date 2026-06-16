import { useState } from "react";
import { COLORS } from "./utils/colors";

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    const err = await onLogin(username.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  const inputStyle = {
    width: "100%", background: COLORS.bg,
    border: `1px solid ${COLORS.border}`, borderRadius: 6,
    padding: "10px 14px", color: COLORS.textPrimary,
    fontSize: 14, marginBottom: 16, outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", color: COLORS.textSecondary,
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{
        width: 400, background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: 40,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, background: COLORS.warning,
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div style={{ color: COLORS.textPrimary, fontWeight: 800, fontSize: 16 }}>Smart Mining</div>
            <div style={{ color: COLORS.textSecondary, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Safety Monitor
            </div>
          </div>
        </div>

        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Sign in</div>
        <div style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 28 }}>
          Access your mine safety dashboard
        </div>

        {error && (
          <div style={{
            background: COLORS.dangerDim, border: `1px solid ${COLORS.danger}55`,
            borderRadius: 6, padding: "10px 14px",
            color: COLORS.danger, fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <label style={labelStyle}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Username"
          style={inputStyle}
          autoFocus
          disabled={loading}
        />

        <label style={labelStyle}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKey}
          placeholder="••••••••"
          style={{ ...inputStyle, marginBottom: 24 }}
          disabled={loading}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", background: loading ? COLORS.border : COLORS.warning,
            border: "none", borderRadius: 6, padding: "12px",
            color: loading ? COLORS.textMuted : "#000",
            fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 20, textAlign: "center" }}>
          Django JWT authentication
        </div>
      </div>
    </div>
  );
}
