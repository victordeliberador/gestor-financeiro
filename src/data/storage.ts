import { openDB } from "idb";
import type { Settings, MonthData, YearMonth } from "../domain/types";
import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION, DEFAULT_USER_ID, DEFAULT_ACTIVE_MONTH } from "../domain/constants";
import { createEmptyMonthData } from "../domain/helpers";
import { migrateSettings } from "./migrations";
import { encryptData, decryptData } from "../domain/encryption";

let sessionPassword: string | null = null;
export function setSessionPassword(p: string | null) { sessionPassword = p; }
export function getSessionPassword() { return sessionPassword; }
export function isSessionUnlocked() { return sessionPassword !== null; }

function defaultSettings(): Settings {
  return { userId: DEFAULT_USER_ID, activeMonth: DEFAULT_ACTIVE_MONTH, schemaVersion: CURRENT_SCHEMA_VERSION, aiMode: "local", categorizationRules: [], createdAt: Date.now(), updatedAt: Date.now() };
}

async function getDB() {
  return openDB(STORAGE_KEYS.INDEXEDDB_NAME, STORAGE_KEYS.INDEXEDDB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "userId" });
      if (!db.objectStoreNames.contains("months")) db.createObjectStore("months", { keyPath: "month" });
    }
  });
}

export class StorageManager {
  private useLS = false;

  async initialize(): Promise<Settings> {
    try {
      await getDB();
    } catch {
      this.useLS = true;
      console.warn("[Storage] Usando localStorage");
    }
    return this.loadSettings();
  }

  async saveSettings(s: Settings): Promise<void> {
    if (this.useLS) { const d = this.lsLoad(); d.settings = s; this.lsSave(d); return; }
    const db = await getDB(); await db.put("settings", s);
  }

  async loadSettings(): Promise<Settings> {
    try {
      let s: Settings | undefined;
      if (this.useLS) { s = this.lsLoad().settings; } else { const db = await getDB(); s = await db.get("settings", DEFAULT_USER_ID); }
      if (!s) { const d = defaultSettings(); await this.saveSettings(d); return d; }
      if (s.schemaVersion < CURRENT_SCHEMA_VERSION) { s = migrateSettings(s); await this.saveSettings(s); }
      return s;
    } catch { const d = defaultSettings(); await this.saveSettings(d); return d; }
  }

  async saveMonthData(monthData: MonthData, settings?: Settings): Promise<void> {
    const enc = settings?.encryptionConfig;
    let toSave: any = monthData;
    if (enc?.enabled && sessionPassword) {
      const { ivHex, dataHex } = await encryptData(JSON.stringify(monthData), sessionPassword, enc.saltHex);
      toSave = { month: monthData.month, updatedAt: monthData.updatedAt, _encrypted: true, _ivHex: ivHex, _dataHex: dataHex };
    }
    if (this.useLS) { const d = this.lsLoad(); d.months[monthData.month] = toSave; this.lsSave(d); return; }
    const db = await getDB(); await db.put("months", toSave);
  }

  async loadMonthData(month: YearMonth, settings?: Settings): Promise<MonthData> {
    let raw: any;
    if (this.useLS) { raw = this.lsLoad().months[month]; } else { const db = await getDB(); raw = await db.get("months", month); }
    if (!raw) return createEmptyMonthData(month);
    return this.decryptIfNeeded(raw, settings);
  }

  async loadAllMonths(settings?: Settings): Promise<MonthData[]> {
    let all: any[];
    if (this.useLS) { all = Object.values(this.lsLoad().months); } else { const db = await getDB(); all = await db.getAll("months"); }
    const result: MonthData[] = [];
    for (const raw of all) { try { result.push(await this.decryptIfNeeded(raw, settings)); } catch { /* skip */ } }
    return result;
  }

  private async decryptIfNeeded(raw: any, settings?: Settings): Promise<MonthData> {
    const enc = settings?.encryptionConfig;
    if (raw._encrypted) {
      if (!enc?.enabled || !sessionPassword) return createEmptyMonthData(raw.month);
      try { return JSON.parse(await decryptData(raw._ivHex, raw._dataHex, sessionPassword, enc.saltHex)); } catch { return createEmptyMonthData(raw.month); }
    }
    return raw as MonthData;
  }

  async clear(): Promise<void> {
    if (this.useLS) { localStorage.removeItem(STORAGE_KEYS.LOCALSTORAGE_FALLBACK_KEY); return; }
    const db = await getDB(); await db.clear("settings"); await db.clear("months");
  }

  async exportAll(settings?: Settings): Promise<string> {
    const s = await this.loadSettings();
    const months = await this.loadAllMonths(settings);
    const monthsMap: Record<string, any> = {};
    months.forEach(m => monthsMap[m.month] = m);
    return JSON.stringify({ settings: s, months: monthsMap, _exportVersion: CURRENT_SCHEMA_VERSION }, null, 2);
  }

  async importAll(json: string): Promise<void> {
    const data = JSON.parse(json);
    await this.saveSettings(data.settings);
    for (const m of Object.values(data.months || {})) await this.saveMonthData(m as MonthData);
  }

  private lsLoad(): { settings: Settings; months: Record<string, any> } {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCALSTORAGE_FALLBACK_KEY) || "{}") || { settings: defaultSettings(), months: {} }; } catch { return { settings: defaultSettings(), months: {} }; }
  }
  private lsSave(d: any) { localStorage.setItem(STORAGE_KEYS.LOCALSTORAGE_FALLBACK_KEY, JSON.stringify(d)); }
}
