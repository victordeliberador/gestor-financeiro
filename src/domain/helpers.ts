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
