import React, { useState, useEffect } from "react";
import { useApp } from "../app/AppProvider";
import { sendChatMessage, checkAIAvailable } from "../services/aiClient";
import { generateId, formatCurrency } from "../domain/helpers";
import type { ConsultantMessage, MonthData } from "../domain/types";

function buildContext(data: MonthData) {
  const totalIncomes = data.incomes.reduce((s, i) => s + i.amountCents, 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + e.amountCents, 0);
  const balance = totalIncomes - totalExpenses;

  const byCategory: Record<string, number> = {};
  data.expenses.forEach(e => {
    const cat = e.categoryMain || "Sem categoria";
    byCategory[cat] = (byCategory[cat] || 0) + e.amountCents;
  });

  const categoryLines = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, cents]) => `  - ${cat}: ${formatCurrency(cents)}`)
    .join("\n");

  const expenseLines = data.expenses
    .slice(-20)
    .map(e => `  - ${e.label}${e.categoryMain ? ` [${e.categoryMain}]` : ""}: ${formatCurrency(e.amountCents)}`)
    .join("\n");

  const incomeLines = data.incomes
    .map(i => `  - ${i.label}: ${formatCurrency(i.amountCents)}`)
    .join("\n");

  return `=== DADOS FINANCEIROS DO MÊS ${data.month} ===
Receitas totais: ${formatCurrency(totalIncomes)}
Despesas totais: ${formatCurrency(totalExpenses)}
Saldo: ${formatCurrency(balance)}

Receitas:
${incomeLines || "  (nenhuma receita lançada)"}

Despesas por categoria:
${categoryLines || "  (nenhuma despesa lançada)"}

Últimos lançamentos:
${expenseLines || "  (nenhuma despesa lançada)"}
=== FIM DOS DADOS ===`;
}

export default function ConsultorPage() {
  const { activeMonth, getMonthData, saveMonthData, settings } = useApp();
  const [messages, setMessages] = useState<ConsultantMessage[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiOnline, setAiOnline] = useState(false);
  const aiMode = settings?.aiMode || "local";

  useEffect(() => {
    getMonthData(activeMonth).then(d => {
      setMessages(d.consultant.messages || []);
      setMonthData(d);
    });
    if (aiMode === "online") checkAIAvailable().then(setAiOnline);
  }, [activeMonth, aiMode]);

  const send = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ConsultantMessage = {
      id: generateId(),
      role: "user",
      content: input,
      createdAt: Date.now(),
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    try {
      let reply: string;

      if (aiMode === "online" && aiOnline && monthData) {
        const context = buildContext(monthData);
        const messagesWithContext = [
          { role: "user", content: context },
          { role: "assistant", content: "Entendido! Tenho acesso aos seus dados financeiros deste mês. Como posso ajudar?" },
          ...newMsgs.slice(-10).map(m => ({ role: m.role, content: m.content })),
        ];
        reply = await sendChatMessage(messagesWithContext);
      } else {
        reply = `Consultor Local (offline)\n\nPara respostas com IA, certifique-se que o servidor está rodando.`;
      }

      const assistantMsg: ConsultantMessage = {
        id: generateId(),
        role: "assistant",
        content: reply,
        createdAt: Date.now(),
        aiMode,
      };

      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs);

      const d = await getMonthData(activeMonth);
      await saveMonthData({
        ...d,
        consultant: { ...d.consultant, messages: finalMsgs },
        updatedAt: Date.now(),
      });
    } catch (err) {
      const errMsg: ConsultantMessage = {
        id: generateId(),
        role: "assistant",
        content: `Erro: ${err instanceof Error ? err.message : "Tente novamente."}`,
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const statusOnline = aiMode === "online" && aiOnline;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", gap: 12 }}>

      <div style={{
        padding: "8px 14px",
        background: statusOnline ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
        border: `1px solid ${statusOnline ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
        borderRadius: 8,
        fontSize: 12,
        color: statusOnline ? "#10b981" : "#f59e0b",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span>{statusOnline ? "🤖 IA Online (Claude) — com acesso aos seus dados do mês" : "🧠 Consultor Local (offline)"}</span>
        {statusOnline && monthData && (
          <span style={{ fontSize: 11, opacity: 0.8 }}>
            {monthData.expenses.length} despesas · {monthData.incomes.length} receitas carregadas
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
            {statusOnline
              ? "💡 Pergunte sobre seus gastos, peça análises ou dicas de economia!"
              : "Envie uma mensagem para começar"}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 14,
              lineHeight: 1.6,
              background: m.role === "user" ? "var(--primary)" : "var(--bg-secondary)",
              color: "var(--text)",
              border: m.role === "assistant" ? "1px solid var(--border)" : "none",
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
            ⏳ Analisando seus dados...
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={statusOnline ? "Ex: Onde estou gastando mais? Como economizar?" : "Pergunte sobre suas finanças..."}
          style={{
            flex: 1,
            padding: "10px 14px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={isLoading || !input.trim()}
          style={{
            padding: "10px 20px",
            background: "var(--primary)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            color: "#fff",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
            opacity: isLoading || !input.trim() ? 0.5 : 1,
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
