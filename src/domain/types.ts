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
