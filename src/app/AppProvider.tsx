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
