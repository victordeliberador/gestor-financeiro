# ============================================================
# GESTOR FINANCEIRO - Bootstrap Parte 3/3 [CORRIGIDO]
# src/app/ + src/ui/ + src/pages/ + main.tsx
# Rodar de: C:\Users\Usuario\gestor-financeiro\
# ============================================================
Write-Host "=== Bootstrap 3/3 - App + UI + Pages ===" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "src\app" | Out-Null
New-Item -ItemType Directory -Force -Path "src\ui" | Out-Null
New-Item -ItemType Directory -Force -Path "src\pages" | Out-Null

# ---- src/main.tsx ------------------------------------------
Set-Content -Path "src\main.tsx" -Encoding UTF8 -Value @'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@

# ---- src/index.css -----------------------------------------
Set-Content -Path "src\index.css" -Encoding UTF8 -Value @'
:root {
  --bg: #0f172a;
  --bg-secondary: #1e293b;
  --border: #334155;
  --text: #f1f5f9;
  --text-secondary: #94a3b8;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Inter", system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
input, select, textarea, button { font-family: inherit; }
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
'@

# ---- src/app/ErrorBoundary.tsx -----------------------------
Set-Content -Path "src\app\ErrorBoundary.tsx" -Encoding UTF8 -Value @'
import { Component, type ReactNode } from "react";
interface P { children: ReactNode; }
interface S { hasError: boolean; error?: Error; }
export default class ErrorBoundary extends Component<P, S> {
  state: S = { hasError: false };
  static getDerivedStateFromError(error: Error): S { return { hasError: true, error }; }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#fff" }}>
        <h2>Algo deu errado</h2>
        <p style={{ color: "#94a3b8", marginTop: 8 }}>{this.state.error?.message}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: "10px 24px", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>
          Recarregar
        </button>
      </div>
    );
  }
}
'@

# ---- src/app/AppProvider.tsx --------------------------------
Set-Content -Path "src\app\AppProvider.tsx" -Encoding UTF8 -Value @'
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { StorageManager } from "../data/storage";
import { getCurrentYearMonth, createEmptyMonthData } from "../domain/helpers";
import type { Settings, MonthData, YearMonth } from "../domain/types";

interface AppCtx {
  settings: Settings | null;
  activeMonth: YearMonth;
  allMonths: MonthData[];
  isLoading: boolean;
  setActiveMonth: (m: YearMonth) => void;
  getMonthData: (m: YearMonth) => Promise<MonthData>;
  saveMonthData: (d: MonthData) => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  loadAllMonths: () => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<void>;
}

const Ctx = createContext<AppCtx | null>(null);
const sm = new StorageManager();

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    sm.initialize().then(s => { setSettings(s); setIsLoading(false); });
  }, []);

  const activeMonth = settings?.activeMonth || getCurrentYearMonth();

  const setActiveMonth = useCallback(async (m: YearMonth) => {
    if (!settings) return;
    const updated = { ...settings, activeMonth: m, updatedAt: Date.now() };
    setSettings(updated);
    await sm.saveSettings(updated);
  }, [settings]);

  const getMonthData = useCallback(async (m: YearMonth): Promise<MonthData> => {
    return sm.loadMonthData(m, settings || undefined);
  }, [settings]);

  const saveMonthData = useCallback(async (d: MonthData) => {
    await sm.saveMonthData(d, settings || undefined);
    setAllMonths(prev => { const next = prev.filter(x => x.month !== d.month); return [...next, d]; });
  }, [settings]);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    if (!settings) return;
    const updated = { ...settings, ...partial, updatedAt: Date.now() };
    setSettings(updated);
    await sm.saveSettings(updated);
  }, [settings]);

  const loadAllMonths = useCallback(async () => {
    const months = await sm.loadAllMonths(settings || undefined);
    setAllMonths(months);
  }, [settings]);

  const exportBackup = useCallback(async () => {
    const json = await sm.exportAll(settings || undefined);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gestor-financeiro-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const importBackup = useCallback(async (file: File) => {
    const json = await file.text();
    await sm.importAll(json);
    const s = await sm.initialize();
    setSettings(s);
  }, []);

  if (isLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#94a3b8", fontSize: 14 }}>Carregando...</div>;
  }

  return (
    <Ctx.Provider value={{ settings, activeMonth, allMonths, isLoading, setActiveMonth, getMonthData, saveMonthData, updateSettings, loadAllMonths, exportBackup, importBackup }}>
      {children}
    </Ctx.Provider>
  );
}
'@

# ---- src/app/App.tsx ----------------------------------------
Set-Content -Path "src\app\App.tsx" -Encoding UTF8 -Value @'
import React, { useState, useEffect } from "react";
import AppProvider from "./AppProvider";
import ErrorBoundary from "./ErrorBoundary";
import UnlockScreen from "../ui/UnlockScreen";
import { StorageManager, setSessionPassword } from "../data/storage";
import type { EncryptionConfig } from "../domain/types";

async function loadEncConfig(): Promise<EncryptionConfig | undefined> {
  try {
    const sm2 = new StorageManager();
    await sm2.initialize();
    const s = await sm2.loadSettings();
    return s.encryptionConfig;
  } catch { return undefined; }
}

const MainLayout = React.lazy(() => import("./MainLayout"));

export default function App() {
  const [cryptoState, setCryptoState] = useState<"loading"|"locked"|"unlocked">("loading");
  const [encConfig, setEncConfig] = useState<EncryptionConfig | undefined>();

  useEffect(() => {
    loadEncConfig().then(cfg => {
      setEncConfig(cfg);
      setCryptoState(cfg?.enabled ? "locked" : "unlocked");
    });
  }, []);

  const handleForgot = async () => {
    const sm2 = new StorageManager();
    await sm2.initialize();
    await sm2.clear();
    setSessionPassword(null);
    window.location.reload();
  };

  if (cryptoState === "loading") {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#94a3b8" }}>⏳ Iniciando...</div>;
  }
  if (cryptoState === "locked" && encConfig) {
    return (
      <ErrorBoundary>
        <UnlockScreen saltHex={encConfig.saltHex} testToken={encConfig.testToken} onUnlock={() => setCryptoState("unlocked")} onForgotPassword={handleForgot} />
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <AppProvider>
        <React.Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#94a3b8" }}>Carregando...</div>}>
          <MainLayout />
        </React.Suspense>
      </AppProvider>
    </ErrorBoundary>
  );
}
'@

Write-Host "  [OK] Parte 1/3 concluida" -ForegroundColor Green
# ---- src/app/MainLayout.tsx ---------------------------------
Set-Content -Path "src\app\MainLayout.tsx" -Encoding UTF8 -Value @'
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
  { id: "consultor", icon: "🤖", label: "Consultor" },
];

export default function MainLayout() {
  const { activeMonth, setActiveMonth } = useApp();
  const [page, setPage] = useState("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        <div style={{ marginBottom: 24, padding: "0 8px" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>💰 Gestor</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Financeiro</div>
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
'@

# ---- src/pages/VisaoGeralPage.tsx --------------------------
Set-Content -Path "src\pages\VisaoGeralPage.tsx" -Encoding UTF8 -Value @'
import React, { useEffect, useState } from "react";
import { useApp } from "../app/AppProvider";
import { formatCurrency, getLastNMonths } from "../domain/helpers";
import type { MonthData } from "../domain/types";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function VisaoGeralPage() {
  const { activeMonth, getMonthData, loadAllMonths, allMonths } = useApp();
  const [current, setCurrent] = useState<MonthData | null>(null);

  useEffect(() => { getMonthData(activeMonth).then(setCurrent); loadAllMonths(); }, [activeMonth]);

  if (!current) return <div style={{ color: "var(--text-secondary)" }}>Carregando...</div>;

  const totalIncome = current.incomes.reduce((s, i) => s + i.amountCents, 0);
  const totalExpense = current.expenses.reduce((s, e) => s + e.amountCents, 0);
  const balance = totalIncome - totalExpense;

  const months6 = getLastNMonths(activeMonth, 6);
  const chartData = months6.map(m => {
    const md = allMonths.find(x => x.month === m);
    return {
      month: m.substring(5),
      receitas: md ? md.incomes.reduce((s,i)=>s+i.amountCents,0)/100 : 0,
      despesas: md ? md.expenses.reduce((s,e)=>s+e.amountCents,0)/100 : 0,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        {[
          { label: "Receitas", value: formatCurrency(totalIncome), color: "#10b981" },
          { label: "Despesas", value: formatCurrency(totalExpense), color: "#ef4444" },
          { label: "Saldo", value: formatCurrency(Math.abs(balance)), color: balance >= 0 ? "#3b82f6" : "#ef4444" },
        ].map(c => (
          <div key={c.label} style={{ padding: 20, background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 20, background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Evolucao 6 Meses</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12 }} />
            <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
'@

# ---- src/pages/MesAtualPage.tsx ----------------------------
Set-Content -Path "src\pages\MesAtualPage.tsx" -Encoding UTF8 -Value @'
import React, { useEffect, useState } from "react";
import { useApp } from "../app/AppProvider";
import { formatCurrency, generateId } from "../domain/helpers";
import { MAIN_CATEGORIES } from "../domain/categories";
import type { MonthData, Expense, Income } from "../domain/types";

export default function MesAtualPage() {
  const { activeMonth, getMonthData, saveMonthData } = useApp();
  const [data, setData] = useState<MonthData | null>(null);
  const [tab, setTab] = useState<"expenses"|"incomes">("expenses");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCat, setFormCat] = useState("");

  useEffect(() => { getMonthData(activeMonth).then(setData); }, [activeMonth]);

  const reload = () => getMonthData(activeMonth).then(setData);

  const handleAdd = async () => {
    if (!data || !formLabel || !formAmount) return;
    const cents = Math.round(parseFloat(formAmount.replace(",",".")) * 100);
    if (isNaN(cents) || cents <= 0) return;
    const now = Date.now();
    if (tab === "incomes") {
      const income: Income = { id: generateId(), label: formLabel, amountCents: cents, kind: "variable", createdAt: now };
      await saveMonthData({ ...data, incomes: [...data.incomes, income], updatedAt: now });
    } else {
      const expense: Expense = { id: generateId(), label: formLabel, amountCents: cents, categoryMain: formCat || undefined, paymentMethod: "pix", scope: "personal", createdAt: now };
      await saveMonthData({ ...data, expenses: [...data.expenses, expense], updatedAt: now });
    }
    setFormLabel(""); setFormAmount(""); setFormCat(""); setShowForm(false); reload();
  };

  const handleDelete = async (id: string) => {
    if (!data || !confirm("Excluir?")) return;
    const now = Date.now();
    if (tab === "incomes") await saveMonthData({ ...data, incomes: data.incomes.filter(i => i.id !== id), updatedAt: now });
    else await saveMonthData({ ...data, expenses: data.expenses.filter(e => e.id !== id), updatedAt: now });
    reload();
  };

  if (!data) return <div style={{ color: "var(--text-secondary)" }}>Carregando...</div>;

  const items = tab === "expenses" ? data.expenses : data.incomes;
  const filtered = items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));
  const total = filtered.reduce((s, i) => s + i.amountCents, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 8, padding: 4, gap: 4 }}>
          {([["expenses","💸 Despesas"],["incomes","💰 Receitas"]] as const).map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: tab === v ? 600 : 400, background: tab === v ? "var(--primary)" : "transparent", color: tab === v ? "#fff" : "var(--text-secondary)" }}>{l}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ flex: 1, padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
        <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", background: "var(--primary)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>+ Adicionar</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{filtered.length} itens</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: tab === "expenses" ? "var(--danger)" : "var(--success)" }}>{formatCurrency(total)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(item => (
          <div key={item.id} style={{ padding: "12px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
              {"categoryMain" in item && item.categoryMain && (
                <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(59,130,246,0.15)", color: "var(--primary)", borderRadius: 12 }}>{item.categoryMain}</span>
              )}
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: tab === "expenses" ? "var(--danger)" : "var(--success)" }}>{formatCurrency(item.amountCents)}</span>
            <button onClick={() => handleDelete(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 16, padding: "4px" }}>🗑️</button>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Nenhum item encontrado</div>}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 24, width: "90%", maxWidth: 440, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16 }}>+ {tab === "expenses" ? "Despesa" : "Receita"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Descricao", formLabel, setFormLabel, "text"],["Valor (R$)", formAmount, setFormAmount, "number"]].map(([l,v,set,t]) => (
                <div key={l as string}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{l as string}</label>
                  <input type={t as string} value={v as string} onChange={e => (set as any)(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
              ))}
              {tab === "expenses" && (
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Categoria</label>
                  <select value={formCat} onChange={e => setFormCat(e.target.value)} style={{ width: "100%", padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }}>
                    <option value="">Sem categoria</option>
                    {MAIN_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 13 }}>Cancelar</button>
                <button onClick={handleAdd} style={{ padding: "9px 18px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600 }}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'@

Write-Host "  [OK] Parte 2/3 concluida" -ForegroundColor Green
# ---- src/pages/ConsultorPage.tsx ---------------------------
Set-Content -Path "src\pages\ConsultorPage.tsx" -Encoding UTF8 -Value @'
import React, { useState, useEffect } from "react";
import { useApp } from "../app/AppProvider";
import { sendChatMessage, checkAIAvailable } from "../services/aiClient";
import { generateId } from "../domain/helpers";
import type { ConsultantMessage } from "../domain/types";

export default function ConsultorPage() {
  const { activeMonth, getMonthData, saveMonthData, settings } = useApp();
  const [messages, setMessages] = useState<ConsultantMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiOnline, setAiOnline] = useState(false);
  const aiMode = settings?.aiMode || "local";

  useEffect(() => {
    getMonthData(activeMonth).then(d => setMessages(d.consultant.messages || []));
    if (aiMode === "online") checkAIAvailable().then(setAiOnline);
  }, [activeMonth, aiMode]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ConsultantMessage = { id: generateId(), role: "user", content: input, createdAt: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);
    try {
      let reply: string;
      if (aiMode === "online" && aiOnline) {
        reply = await sendChatMessage(newMsgs.map(m => ({ role: m.role, content: m.content })));
      } else {
        reply = `**Consultor Local** (offline)\n\nAnalisando suas financas do mes... Para respostas com IA, ative o modo Online nas configuracoes e certifique-se que o servidor esta rodando.`;
      }
      const assistantMsg: ConsultantMessage = { id: generateId(), role: "assistant", content: reply, createdAt: Date.now(), aiMode };
      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs);
      const d = await getMonthData(activeMonth);
      await saveMonthData({ ...d, consultant: { ...d.consultant, messages: finalMsgs }, updatedAt: Date.now() });
    } catch (err) {
      const errMsg: ConsultantMessage = { id: generateId(), role: "assistant", content: `Erro: ${err instanceof Error ? err.message : "Tente novamente."}`, createdAt: Date.now() };
      setMessages(prev => [...prev, errMsg]);
    } finally { setIsLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", gap: 12 }}>
      <div style={{ padding: "8px 14px", background: aiMode === "online" && aiOnline ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${aiMode === "online" && aiOnline ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`, borderRadius: 8, fontSize: 12, color: aiMode === "online" && aiOnline ? "#10b981" : "#f59e0b" }}>
        {aiMode === "online" && aiOnline ? "🤖 IA Online (Claude)" : "💻 Consultor Local (offline)"}
      </div>
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Envie uma mensagem para comecar</div>}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 10, fontSize: 14, lineHeight: 1.6, background: m.role === "user" ? "var(--primary)" : "var(--bg-secondary)", color: "var(--text)", border: m.role === "assistant" ? "1px solid var(--border)" : "none" }}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>⏳ Processando...</div>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Pergunte sobre suas financas..." style={{ flex: 1, padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
        <button onClick={send} disabled={isLoading || !input.trim()} style={{ padding: "10px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, opacity: isLoading || !input.trim() ? 0.5 : 1 }}>Enviar</button>
      </div>
    </div>
  );
}
'@

# ---- src/ui/UnlockScreen.tsx --------------------------------
Set-Content -Path "src\ui\UnlockScreen.tsx" -Encoding UTF8 -Value @'
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
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
'@

# ---- src/ui/SettingsModal.tsx (simplificado mas funcional) --
Set-Content -Path "src\ui\SettingsModal.tsx" -Encoding UTF8 -Value @'
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

  const handleExport = async () => { await exportBackup(); show("Backup exportado!"); };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try { await importBackup(file); show("Backup importado com sucesso!"); } catch (err) { show(`Erro: ${err instanceof Error ? err.message : "falha"}`); }
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
          { label: "🤖 Modo IA", btn: settings?.aiMode === "online" ? "💻 Usar Local" : "🤖 Usar IA Online", action: handleAIMode, desc: `Atual: ${settings?.aiMode === "online" ? "IA Online" : "Local (offline)"}` },
          { label: "📥 Backup", btn: "Exportar JSON", action: handleExport, desc: "Baixa todos os dados" },
          { label: "📤 Restaurar", btn: "Importar JSON", action: handleImport, desc: "Restaura de arquivo JSON" },
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
'@

Write-Host "  [OK] src/app/ e src/pages/ e src/ui/ criados" -ForegroundColor Green

# ---- Instalar deps do servidor ------------------------------
Write-Host ""
Write-Host "Instalando dependencias do servidor..." -ForegroundColor Yellow
Set-Location -Path "server"
npm install --silent
Set-Location -Path ".."
Write-Host "  [OK] server/node_modules instalado" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Parte 3/3 concluida!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Crie o arquivo .env na raiz com:" -ForegroundColor White
Write-Host "   ANTHROPIC_API_KEY=sk-ant-api03-SUA_CHAVE" -ForegroundColor Gray
Write-Host "   PORT=3001" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Para rodar (so frontend - funciona offline):" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "3. Para rodar com IA (frontend + servidor):" -ForegroundColor White
Write-Host "   npm run dev:all" -ForegroundColor Green
Write-Host ""
Write-Host "Acesse: http://localhost:5173" -ForegroundColor Cyan
