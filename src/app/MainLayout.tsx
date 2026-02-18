import React, { useState } from "react";
import { useApp } from "./AppProvider";
import { formatYearMonth, getPreviousMonth, getNextMonth, getCurrentYearMonth } from "../domain/helpers";

const VisaoGeralPage = React.lazy(() => import("../pages/VisaoGeralPage"));
const MesAtualPage = React.lazy(() => import("../pages/MesAtualPage"));
const ConsultorPage = React.lazy(() => import("../pages/ConsultorPage"));
const SettingsModal = React.lazy(() => import("../ui/SettingsModal"));

const NAV = [
  { id: "overview", icon: "📊", label: "Visao Geral" },
  { id: "month", icon: "📅", label: "Mes Atual" },
  { id: "consultor", icon: "🤖", label: "Consultor IA" },
];

export default function MainLayout() {
  const { activeMonth, setActiveMonth } = useApp();
  const [page, setPage] = useState("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        <div style={{ marginBottom: 24, padding: "0 8px" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Gestor Financeiro</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Profissional</div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: 13, fontWeight: page === n.id ? 600 : 400,
              background: page === n.id ? "rgba(59,130,246,0.2)" : "transparent", color: page === n.id ? "#60a5fa" : "var(--text-secondary)",
            }}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => setSettingsOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontFamily: "inherit" }}>
          ⚙️ Configuracoes
        </button>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {NAV.find(n => n.id === page)?.label || "Gestor Financeiro"}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setActiveMonth(getPreviousMonth(activeMonth))} style={{ padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>‹</button>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", minWidth: 90, textAlign: "center" }}>{formatYearMonth(activeMonth)}</span>
            <button onClick={() => setActiveMonth(getNextMonth(activeMonth))} style={{ padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>›</button>
            <button onClick={() => setActiveMonth(getCurrentYearMonth())} style={{ padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>Hoje</button>
          </div>
        </header>

        <div style={{ flex: 1, padding: "24px", overflow: "auto" }}>
          <React.Suspense fallback={<div style={{ color: "var(--text-secondary)" }}>Carregando...</div>}>
            {page === "overview" && <VisaoGeralPage />}
            {page === "month" && <MesAtualPage />}
            {page === "consultor" && <ConsultorPage />}
          </React.Suspense>
        </div>
      </main>

      {settingsOpen && (
        <React.Suspense fallback={null}>
          <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} currentMonth={activeMonth} />
        </React.Suspense>
      )}
    </div>
  );
}
