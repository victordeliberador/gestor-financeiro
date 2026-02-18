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
