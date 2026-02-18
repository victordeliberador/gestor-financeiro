import React, { useState } from "react";
import { useApp } from "../app/AppProvider";
import type { YearMonth } from "../domain/types";

interface Props { isOpen: boolean; onClose: () => void; currentMonth: YearMonth; }

export default function SettingsModal({ isOpen, onClose, currentMonth }: Props) {
  const { settings, updateSettings, exportBackup, importBackup } = useApp();
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const handleAIMode = async () => {
    const newMode = settings?.aiMode === "online" ? "local" : "online";
    await updateSettings({ aiMode: newMode });
    show(`Modo alterado para: ${newMode === "online" ? "IA Online" : "Local"}`);
  };

  const handleExport = async () => { await exportBackup(); show("Backup salvo com sucesso!"); };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try { await importBackup(file); show("Dados restaurados com sucesso!"); } catch (err) { show(`Erro: ${err instanceof Error ? err.message : "falha"}`); }
    };
    input.click();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", zIndex: 1000 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", width: 380, height: "100vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
          <h3 style={{ fontSize: 18 }}>Configuracoes</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        {msg && <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#10b981" }}>{msg}</div>}

        {[
          { label: "Modo IA", btn: settings?.aiMode === "online" ? "Usar Local" : "Usar IA Online", action: handleAIMode, desc: `Atual: ${settings?.aiMode === "online" ? "IA Online" : "Local (offline)"}` },
          { label: "Salvar Dados", btn: "Fazer Backup", action: handleExport, desc: "Baixa todos os seus dados em arquivo" },
          { label: "Restaurar Dados", btn: "Importar Backup", action: handleImport, desc: "Restaura dados de um arquivo anterior" },
        ].map(s => (
          <div key={s.label} style={{ marginBottom: 20, padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>{s.desc}</div>
            <button onClick={s.action} style={{ width: "100%", padding: "9px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>{s.btn}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
