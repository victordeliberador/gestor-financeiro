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
