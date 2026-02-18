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
  const [showImport, setShowImport] = useState(false);
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
          {([["expenses","Despesas"],["incomes","Receitas"]] as const).map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: tab === v ? 600 : 400, background: tab === v ? "var(--primary)" : "transparent", color: tab === v ? "#fff" : "var(--text-secondary)" }}>{l}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ flex: 1, padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none" }} />
        <button onClick={() => setShowImport(true)} style={{ padding: "8px 16px", background: "var(--success)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>📸 Importar Extrato</button>
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

      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 24, width: "90%", maxWidth: 500, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16 }}>📸 Importar Extrato Bancario</h3>
              <button onClick={() => setShowImport(false)} style={{ background: "none", border: "none", color: "var(--text)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: 8, textAlign: "center", marginBottom: 16, cursor: "pointer" }} onClick={() => document.getElementById("file-upload")?.click()}>
              <input id="file-upload" type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) alert(`Arquivo selecionado: ${file.name}\n\nFuncionalidade de IA sera ativada quando voce adicionar sua chave API da Anthropic no arquivo .env`);
              }} />
              <div style={{ fontSize: 48, marginBottom: 8 }}>📤</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>Clique para selecionar ou arraste aqui</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Formatos: JPG, PNG, PDF</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--warning)", padding: "10px", background: "rgba(245,158,11,0.1)", borderRadius: 6, marginBottom: 16 }}>
              ⚠️ Para usar esta funcionalidade, voce precisa:
              <ul style={{ marginTop: 8, marginLeft: 20 }}>
                <li>Criar conta em anthropic.com/console</li>
                <li>Gerar uma chave API</li>
                <li>Adicionar no arquivo .env</li>
                <li>Rodar: npm run dev:all</li>
              </ul>
            </div>
            <button onClick={() => setShowImport(false)} style={{ width: "100%", padding: "10px", background: "var(--border)", border: "none", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 13 }}>Fechar</button>
          </div>
        </div>
      )}

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
