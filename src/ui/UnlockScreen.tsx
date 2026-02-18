import React, { useState } from "react";
import { verifyPassword } from "../domain/encryption";
import { setSessionPassword } from "../data/storage";

interface Props { saltHex: string; testToken?: { ivHex: string; dataHex: string }; onUnlock: () => void; onForgotPassword: () => void; }

export default function UnlockScreen({ saltHex, testToken, onUnlock, onForgotPassword }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleUnlock = async () => {
    if (!password) { setError("Digite a senha"); return; }
    setIsVerifying(true); setError(null);
    try {
      if (!testToken) { setSessionPassword(password); onUnlock(); return; }
      const ok = await verifyPassword(password, saltHex, testToken);
      if (ok) { setSessionPassword(password); onUnlock(); }
      else setError("Senha incorreta. Tente novamente.");
    } catch { setError("Erro ao verificar senha"); } finally { setIsVerifying(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 40, maxWidth: 400, width: "90%", textAlign: "center", border: "1px solid #334155" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>ðŸ”</div>
        <h2 style={{ marginBottom: 8, fontSize: 22 }}>Gestor Financeiro</h2>
        <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>App protegido. Digite a senha para desbloquear.</p>
        {error && <div style={{ padding: "10px", background: "rgba(239,68,68,0.15)", color: "#ef4444", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUnlock()} placeholder="Senha" autoFocus
          style={{ width: "100%", padding: "12px", border: "1px solid #334155", borderRadius: 8, fontSize: 16, marginBottom: 14, outline: "none", background: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
        <button onClick={handleUnlock} disabled={isVerifying || !password} style={{ width: "100%", padding: 12, background: "#3b82f6", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer", color: "#fff", marginBottom: 14, opacity: isVerifying || !password ? 0.5 : 1 }}>
          {isVerifying ? "Verificando..." : "Desbloquear"}
        </button>
        <button onClick={() => setShowForgot(true)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Esqueci a senha</button>
        {showForgot && (
          <div style={{ marginTop: 20, padding: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}>
            <p style={{ color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>Isso apagara TODOS os dados!</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setShowForgot(false)} style={{ padding: "8px 16px", background: "#334155", border: "none", borderRadius: 6, cursor: "pointer", color: "#fff", fontSize: 13 }}>Cancelar</button>
              <button onClick={onForgotPassword} style={{ padding: "8px 16px", background: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", color: "#fff", fontWeight: 600, fontSize: 13 }}>Apagar Tudo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
