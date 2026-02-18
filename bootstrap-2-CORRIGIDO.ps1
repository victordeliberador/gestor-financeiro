# ============================================================
# GESTOR FINANCEIRO - Bootstrap Parte 2/4 [CORRIGIDO]
# src/domain/ + src/data/ + src/services/
# Rodar de: C:\Users\Usuario\gestor-financeiro\
# ============================================================
Write-Host "=== Bootstrap 2/4 - Domain + Data + Services ===" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "src\domain" | Out-Null
New-Item -ItemType Directory -Force -Path "src\data" | Out-Null
New-Item -ItemType Directory -Force -Path "src\services" | Out-Null

# ---- src/domain/constants.ts -------------------------------
Set-Content -Path "src\domain\constants.ts" -Encoding UTF8 -Value @'
export const CURRENT_SCHEMA_VERSION = 3;
export const DEFAULT_USER_ID = "local";
export const DEFAULT_ACTIVE_MONTH = "2026-02";
export const STORAGE_KEYS = {
  INDEXEDDB_NAME: "gestor-financeiro-db",
  INDEXEDDB_VERSION: 1,
  LOCALSTORAGE_FALLBACK_KEY: "gestor-financeiro-backup",
  ENCRYPTION_SALT_KEY: "gestor-financeiro-salt",
} as const;
export const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: "credit", label: "Credito" },
  { value: "debit", label: "Debito" },
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transfer", label: "Transferencia" },
];
export const EXPENSE_SCOPES: Array<{ value: string; label: string }> = [
  { value: "personal", label: "Pessoal" },
  { value: "professional", label: "Profissional" },
];
'@

# ---- src/domain/types.ts -----------------------------------
Set-Content -Path "src\domain\types.ts" -Encoding UTF8 -Value @'
export type UserId = string;
export type YearMonth = string;
export type AIMode = "local" | "online";
export type PaymentMethod = "credit" | "debit" | "cash" | "pix" | "transfer";
export type ExpenseScope = "personal" | "professional";
export type IncomeKind = "fixed" | "variable";

export interface Income {
  id: string;
  label: string;
  amountCents: number;
  kind: IncomeKind;
  createdAt: number;
  notes?: string;
  tags?: string[];
}

export interface Expense {
  id: string;
  label: string;
  amountCents: number;
  categoryMain?: string;
  categorySub?: string;
  paymentMethod?: PaymentMethod;
  scope?: ExpenseScope;
  createdAt: number;
  notes?: string;
  tags?: string[];
}

export interface ConsultantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  aiMode?: AIMode;
  pinned?: boolean;
}

export interface MonthData {
  month: YearMonth;
  incomes: Income[];
  expenses: Expense[];
  consultant: {
    messages: ConsultantMessage[];
    pinnedInsights: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface AutoCategorizationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  matchType: "contains" | "regex";
  keywords: string[];
  regex?: string;
  applies: {
    categoryMain?: string;
    categorySub?: string;
    scope?: ExpenseScope;
    paymentMethod?: PaymentMethod;
    tags?: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: "AES-GCM";
  keyDerivation: "PBKDF2";
  iterations: number;
  saltHex: string;
  createdAt: number;
  updatedAt: number;
  testToken?: { ivHex: string; dataHex: string };
}

export interface Settings {
  userId: UserId;
  activeMonth: YearMonth;
  userDisplayName?: string;
  schemaVersion: number;
  aiMode?: AIMode;
  createdAt: number;
  updatedAt: number;
  categorizationRules?: AutoCategorizationRule[];
  encryptionConfig?: EncryptionConfig;
}

export interface AppDatabase {
  settings: Settings;
  months: Record<YearMonth, MonthData>;
}

export interface StatementTransaction {
  date: string;
  description: string;
  amountCents: number;
  kind: "expense" | "income";
  accountInfo?: string;
}

export interface StatementImportRow extends StatementTransaction {
  id: string;
  status: "valid" | "duplicate" | "invalid";
  isDuplicate: boolean;
  isSelected: boolean;
  suggestedCategory?: {
    categoryMain?: string;
    categorySub?: string;
    matchedRule?: string;
    confidence: number;
  };
  editedDate?: string;
  editedDescription?: string;
  editedAmountCents?: number;
  editedKind?: "expense" | "income";
  editedCategoryMain?: string;
  editedCategorySub?: string;
}

export interface ExtractedTransaction {
  date: string;
  description: string;
  amountCents: number;
  kind: "expense" | "income";
  suggested: {
    categoryMain: string | null;
    categorySub: string | null;
    confidence: number;
  };
}

export interface ImportTransactionRow extends ExtractedTransaction {
  id: string;
  status: "valid" | "duplicate" | "invalid";
  isDuplicate: boolean;
  isSelected: boolean;
  editedDate?: string;
  editedDescription?: string;
  editedAmountCents?: number;
  editedKind?: "expense" | "income";
  editedCategoryMain?: string;
  editedCategorySub?: string;
}
'@

# ---- src/domain/helpers.ts ---------------------------------
Set-Content -Path "src\domain\helpers.ts" -Encoding UTF8 -Value @'
import type { MonthData, YearMonth } from "./types";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function createEmptyMonthData(month: YearMonth): MonthData {
  const now = Date.now();
  return {
    month,
    incomes: [],
    expenses: [],
    consultant: { messages: [], pinnedInsights: [] },
    createdAt: now,
    updatedAt: now,
  };
}

export function getCurrentYearMonth(): YearMonth {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonth(ym: YearMonth): string {
  const [year, month] = ym.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function getPreviousMonth(ym: YearMonth): YearMonth {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getNextMonth(ym: YearMonth): YearMonth {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getLastNMonths(current: YearMonth, n: number): YearMonth[] {
  const months: YearMonth[] = [];
  let ym = current;
  for (let i = 0; i < n; i++) {
    months.unshift(ym);
    ym = getPreviousMonth(ym);
  }
  return months;
}
'@

# ---- src/domain/categories.ts ------------------------------
Set-Content -Path "src\domain\categories.ts" -Encoding UTF8 -Value @'
export interface Category {
  name: string;
  subs: string[];
  icon: string;
}

export const MAIN_CATEGORIES: Category[] = [
  { name: "Moradia", icon: "🏠", subs: ["Aluguel","Condominio","IPTU","Manutencao","Financiamento","Agua","Luz","Gas","Internet","Outros"] },
  { name: "Alimentacao", icon: "🍽️", subs: ["Supermercado","Restaurante","Delivery","Padaria","Feira","Outros"] },
  { name: "Transporte e Mobilidade", icon: "🚗", subs: ["Combustivel","Uber/99","Onibus/Metro","Estacionamento","IPVA","Seguro Auto","Manutencao","Outros"] },
  { name: "Saude", icon: "💊", subs: ["Plano de Saude","Farmacia","Consulta Medica","Exames","Academia","Outros"] },
  { name: "Educacao e Desenvolvimento", icon: "📚", subs: ["Cursos","Livros","Pos-graduacao","Idiomas","Outros"] },
  { name: "Familia e Criancas", icon: "👨‍👩‍👧", subs: ["Escola","Material Escolar","Brinquedos","Babysitter","Outros"] },
  { name: "Contas e Assinaturas", icon: "📱", subs: ["Celular","Software","Streaming","Clube","Outros"] },
  { name: "Cuidados Pessoais", icon: "💅", subs: ["Cabelo","Estetica","Vestuario","Outros"] },
  { name: "Compras e Vida Domestica", icon: "🛒", subs: ["Eletronicos","Moveis","Utensilios","Outros"] },
  { name: "Lazer e Cultura", icon: "🎭", subs: ["Cinema","Shows","Viagem","Hobbies","Streaming","Outros"] },
  { name: "Pets", icon: "🐾", subs: ["Racao","Veterinario","Banho/Tosa","Outros"] },
  { name: "Dividas e Obrigacoes", icon: "💳", subs: ["Cartao de Credito","Emprestimo","Outros"] },
  { name: "Impostos e Taxas", icon: "🏛️", subs: ["IRPF","IPTU","IPVA","IOF","Outros"] },
  { name: "Seguros e Protecao", icon: "🛡️", subs: ["Seguro de Vida","Seguro Auto","Seguro Residencial","Outros"] },
  { name: "Doacoes e Solidariedade", icon: "❤️", subs: ["Doacao","Dizimo","Outros"] },
  { name: "Investimentos e Reserva", icon: "📈", subs: ["Reserva de Emergencia","Acoes","Fundos","Previdencia","Outros"] },
  { name: "Despesas Eventuais", icon: "🎲", subs: ["Presente","Multa","Conserto","Outros"] },
  { name: "Transferencias e Ajustes", icon: "↔️", subs: ["Transferencia","Reembolso","Ajuste","Outros"] },
  { name: "Advocacia", icon: "⚖️", subs: ["Honorarios","OAB","Material","Escritorio","Outros"] },
];

export function getSubcategories(main: string): string[] {
  return MAIN_CATEGORIES.find(c => c.name === main)?.subs || [];
}
'@

Write-Host "  [OK] Parte 1/4 concluida" -ForegroundColor Green
# ---- src/domain/autoCategorization.ts ----------------------
Set-Content -Path "src\domain\autoCategorization.ts" -Encoding UTF8 -Value @'
import type { AutoCategorizationRule } from "./types";

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}

function matchesRule(description: string, rule: AutoCategorizationRule): boolean {
  if (!rule.enabled) return false;
  const norm = normalizeText(description);
  if (rule.matchType === "contains") {
    return rule.keywords.some(k => norm.includes(normalizeText(k)));
  }
  if (rule.matchType === "regex" && rule.regex) {
    try { return new RegExp(rule.regex, "i").test(description); } catch { return false; }
  }
  return false;
}

export function applyAutoCategorization(description: string, rules: AutoCategorizationRule[]) {
  const sorted = rules.filter(r => r.enabled).sort((a,b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (matchesRule(description, rule)) {
      return { categoryMain: rule.applies.categoryMain, categorySub: rule.applies.categorySub,
        scope: rule.applies.scope, paymentMethod: rule.applies.paymentMethod,
        matchedRule: rule, confidence: 0.9 };
    }
  }
  return { confidence: 0 };
}

export function testRule(rule: AutoCategorizationRule, testText: string) {
  const matches = matchesRule(testText, rule);
  return matches ? { matches: true, result: { categoryMain: rule.applies.categoryMain, categorySub: rule.applies.categorySub } } : { matches: false };
}

export function validateRule(rule: Partial<AutoCategorizationRule>): string | null {
  if (!rule.name?.trim()) return "Nome obrigatorio";
  if (rule.matchType === "contains" && (!rule.keywords || rule.keywords.length === 0)) return "Adicione pelo menos uma palavra-chave";
  if (rule.matchType === "regex") {
    if (!rule.regex?.trim()) return "Regex obrigatoria";
    try { new RegExp(rule.regex); } catch { return "Regex invalida"; }
  }
  if (!rule.applies || Object.keys(rule.applies).length === 0) return "Defina pelo menos uma categoria para aplicar";
  return null;
}
'@

# ---- src/domain/encryption.ts ------------------------------
Set-Content -Path "src\domain\encryption.ts" -Encoding UTF8 -Value @'
const PBKDF2_ITERATIONS = 100000;

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2,"0")).join("");
}
function hexToArrayBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i/2] = parseInt(hex.substring(i, i+2), 16);
  return bytes;
}
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"]);
}
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
export async function encryptData(data: string, password: string, saltHex: string): Promise<{ ivHex: string; dataHex: string }> {
  const salt = hexToArrayBuffer(saltHex);
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data));
  return { ivHex: arrayBufferToHex(iv), dataHex: arrayBufferToHex(encrypted) };
}
export async function decryptData(ivHex: string, dataHex: string, password: string, saltHex: string): Promise<string> {
  const salt = hexToArrayBuffer(saltHex);
  const key = await deriveKey(password, salt);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: hexToArrayBuffer(ivHex) }, key, hexToArrayBuffer(dataHex));
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error("Senha incorreta ou dados corrompidos"); }
}
export async function verifyPassword(password: string, saltHex: string, testToken: { ivHex: string; dataHex: string }): Promise<boolean> {
  try { return (await decryptData(testToken.ivHex, testToken.dataHex, password, saltHex)) === "VALID_PASSWORD"; } catch { return false; }
}
export async function createPasswordTestToken(password: string, saltHex: string) {
  return encryptData("VALID_PASSWORD", password, saltHex);
}
'@

# ---- src/domain/ofxParser.ts -------------------------------
Set-Content -Path "src\domain\ofxParser.ts" -Encoding UTF8 -Value @'
import type { StatementTransaction } from "./types";

export function isOFX(content: string): boolean {
  return content.includes("OFXHEADER") || content.includes("<OFX>");
}

export function parseOFX(content: string): StatementTransaction[] {
  const transactions: StatementTransaction[] = [];
  try {
    let clean = content;
    const idx = clean.indexOf("<OFX>");
    if (idx !== -1) clean = clean.substring(idx);
    clean = clean.replace(/<([A-Z0-9]+)>([^<]+)/g,"<$1>$2</$1>");
    const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;
    while ((match = regex.exec(clean)) !== null) {
      const trn = match[1];
      const dateMatch = trn.match(/<DTPOSTED>(\d{8})/);
      const amountMatch = trn.match(/<TRNAMT>([-\d.]+)/);
      const memoMatch = trn.match(/<MEMO>([^<]+)/);
      const nameMatch = trn.match(/<NAME>([^<]+)/);
      if (!dateMatch || !amountMatch) continue;
      const ds = dateMatch[1];
      const date = `${ds.substring(0,4)}-${ds.substring(4,6)}-${ds.substring(6,8)}`;
      const amount = parseFloat(amountMatch[1]);
      transactions.push({
        date, description: (memoMatch?.[1] || nameMatch?.[1] || "Transacao").trim(),
        amountCents: Math.round(Math.abs(amount) * 100),
        kind: amount < 0 ? "expense" : "income",
      });
    }
    return transactions;
  } catch (err) {
    throw new Error("Arquivo OFX invalido ou formato nao suportado");
  }
}
'@

# ---- src/domain/statementImport.ts -------------------------
Set-Content -Path "src\domain\statementImport.ts" -Encoding UTF8 -Value @'
import Papa from "papaparse";
import { parseOFX, isOFX } from "./ofxParser";
import { applyAutoCategorization } from "./autoCategorization";
import { generateId } from "./helpers";
import type { StatementTransaction, StatementImportRow, MonthData, AutoCategorizationRule } from "./types";

function normalizeDesc(desc: string): string {
  return desc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}
function fingerprint(t: StatementTransaction): string {
  return `${t.date}::${t.amountCents}::${normalizeDesc(t.description)}`;
}
function isValid(t: StatementTransaction): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.description.trim().length > 0 && t.amountCents > 0 && (t.kind === "expense" || t.kind === "income");
}

async function parseCSV(content: string): Promise<StatementTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const transactions: StatementTransaction[] = [];
        (results.data as any[]).forEach(row => {
          const dateField = row.date || row.Data || row.DATE || row["Data"];
          const descField = row.description || row["Descricao"] || row.memo || row.MEMO;
          const amountField = row.amount || row.value || row.valor || row.Valor;
          const typeField = row.type || row.kind || row.tipo;
          if (!dateField || !descField || !amountField) return;
          let date = dateField;
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) { const [d,m,y] = date.split("/"); date = `${y}-${m}-${d}`; }
          if (/^\d{2}-\d{2}-\d{4}$/.test(date)) { const [d,m,y] = date.split("-"); date = `${y}-${m}-${d}`; }
          const amount = parseFloat(String(amountField).replace(/[^\d.,-]/g,"").replace(",","."));
          if (isNaN(amount)) return;
          const amountCents = Math.round(Math.abs(amount) * 100);
          let kind: "expense" | "income";
          if (typeField) {
            const t = String(typeField).toLowerCase();
            kind = (t.includes("receita") || t.includes("income") || t.includes("credit")) ? "income" : "expense";
          } else { kind = amount < 0 ? "expense" : "income"; }
          transactions.push({ date, description: String(descField).trim(), amountCents, kind });
        });
        resolve(transactions);
      },
      error: reject,
    });
  });
}

export async function parseStatementFile(file: File): Promise<StatementTransaction[]> {
  const content = await file.text();
  return isOFX(content) ? parseOFX(content) : parseCSV(content);
}

export function prepareStatementPreview(extracted: StatementTransaction[], existingMonths: MonthData[], rules: AutoCategorizationRule[]) {
  const fps = new Set<string>();
  existingMonths.forEach(m => {
    m.incomes.forEach(i => fps.add(fingerprint({ date: new Date(i.createdAt).toISOString().split("T")[0], description: i.label, amountCents: i.amountCents, kind: "income" })));
    m.expenses.forEach(e => fps.add(fingerprint({ date: new Date(e.createdAt).toISOString().split("T")[0], description: e.label, amountCents: e.amountCents, kind: "expense" })));
  });
  const rows: StatementImportRow[] = extracted.map(t => {
    const valid = isValid(t);
    const dup = fps.has(fingerprint(t));
    let status: "valid"|"duplicate"|"invalid" = valid ? (dup ? "duplicate" : "valid") : "invalid";
    let suggestedCategory;
    if (valid && t.kind === "expense") {
      const r = applyAutoCategorization(t.description, rules);
      if (r.confidence >= 0.7) suggestedCategory = { categoryMain: r.categoryMain, categorySub: r.categorySub, matchedRule: (r as any).matchedRule?.name, confidence: r.confidence };
    }
    return { ...t, id: generateId(), status, isDuplicate: dup, isSelected: valid && !dup, suggestedCategory };
  });
  return { transactions: rows, totalCount: rows.length, validCount: rows.filter(r=>r.status==="valid").length, duplicateCount: rows.filter(r=>r.status==="duplicate").length, invalidCount: rows.filter(r=>r.status==="invalid").length };
}
'@

# ---- src/domain/csvExport.ts -------------------------------
Set-Content -Path "src\domain\csvExport.ts" -Encoding UTF8 -Value @'
import Papa from "papaparse";
import type { MonthData } from "./types";

export function exportToCSV(months: MonthData[]): void {
  const rows: any[] = [];
  months.forEach(m => {
    m.incomes.forEach(i => rows.push({ month: m.month, type: "income", label: i.label, amount: (i.amountCents/100).toFixed(2), amountCents: i.amountCents, kind: i.kind, createdAt: new Date(i.createdAt).toISOString() }));
    m.expenses.forEach(e => rows.push({ month: m.month, type: "expense", label: e.label, amount: (e.amountCents/100).toFixed(2), amountCents: e.amountCents, categoryMain: e.categoryMain||"", categorySub: e.categorySub||"", paymentMethod: e.paymentMethod||"", scope: e.scope||"", createdAt: new Date(e.createdAt).toISOString() }));
  });
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const ts = new Date().toISOString().slice(0,16).replace(/[-:T]/g,"").slice(0,12);
  link.setAttribute("href", url);
  link.setAttribute("download", `gestor-financeiro-export-${ts}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
'@

Write-Host "  [OK] Parte 2/4 concluida" -ForegroundColor Green
# ---- src/data/migrations.ts --------------------------------
Set-Content -Path "src\data\migrations.ts" -Encoding UTF8 -Value @'
import type { Settings } from "../domain/types";
import { CURRENT_SCHEMA_VERSION } from "../domain/constants";

export function migrateSettings(settings: Settings): Settings {
  const s = { ...settings };
  if (s.schemaVersion < 2) { s.aiMode = s.aiMode || "local"; }
  if (s.schemaVersion < 3) { s.categorizationRules = s.categorizationRules || []; }
  s.schemaVersion = CURRENT_SCHEMA_VERSION;
  s.updatedAt = Date.now();
  return s;
}
'@

# ---- src/data/storage.ts -----------------------------------
Set-Content -Path "src\data\storage.ts" -Encoding UTF8 -Value @'
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
'@

Write-Host "  [OK] src/data/ criado" -ForegroundColor Green

# ---- src/services/aiClient.ts ------------------------------
Set-Content -Path "src\services\aiClient.ts" -Encoding UTF8 -Value @'
const API_TIMEOUT = 30000;

export async function sendChatMessage(messages: any[], context?: any): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context }),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.message || `Erro ${res.status}`);
    const data = await res.json();
    return data.reply;
  } catch (err) {
    clearTimeout(id);
    if (err instanceof Error && err.name === "AbortError") throw new Error("Timeout: servidor demorou muito.");
    throw err;
  }
}

export async function checkAIAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { method: "GET" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok" && data.aiAvailable === true;
  } catch { return false; }
}
'@

# ---- src/services/importClient.ts --------------------------
Set-Content -Path "src\services\importClient.ts" -Encoding UTF8 -Value @'
import type { ExtractedTransaction } from "../domain/types";

export async function extractTransactions(file: File): Promise<ExtractedTransaction[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60000);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/import/extract", { method: "POST", body: formData, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.message || `Erro ${res.status}`); }
    const data = await res.json();
    return data.transactions || [];
  } catch (err) {
    clearTimeout(id);
    if (err instanceof Error && err.name === "AbortError") throw new Error("Timeout: processamento demorou muito.");
    throw err;
  }
}
'@

Write-Host "  [OK] src/services/ criado" -ForegroundColor Green
Write-Host ""
Write-Host "Parte 3/4 concluida!" -ForegroundColor Cyan
Write-Host "Parte 2/3 concluida!" -ForegroundColor Cyan
Write-Host "Proximo passo: execute bootstrap-3-CORRIGIDO.ps1" -ForegroundColor Yellow