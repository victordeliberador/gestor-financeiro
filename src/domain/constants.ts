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
