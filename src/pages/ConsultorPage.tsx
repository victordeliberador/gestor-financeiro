import React, { useState, useEffect, useRef } from "react";
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
  const categoryLines = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, cents]) => `  - ${cat}: ${formatCurrency(cents)}`).join("\n");
  const expenseLines = data.expenses.slice(-30).map(e => `  - ${e.label}${e.categoryMain ? ` [${e.categoryMain}]` : ""}: ${formatCurrency(e.amountCents)}`).join("\n");
  const incomeLines = data.incomes.map(i => `  - ${i.label}: ${formatCurrency(i.amountCents)}`).join("\n");
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

async function addPunctuation(text: string): Promise<string> {
  try {
    const API_URL = import.meta.env.VITE_API_URL || "";
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Adicione pontuação correta (vírgulas, pontos, interrogações, exclamações e parágrafos onde necessário) no texto abaixo. Mantenha exatamente as mesmas palavras, apenas corrija a pontuação. Retorne SOMENTE o texto corrigido, sem explicações:\n\n${text}`
          }
        ]
      }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.reply || text;
  } catch {
    return text;
  }
}

export default function ConsultorPage() {
  const { activeMonth, getMonthData, saveMonthData, settings } = useApp();
  const [messages, setMessages] = useState<ConsultantMessage[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiOnline, setAiOnline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPunctuating, setIsPunctuating] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const aiMode = settings?.aiMode || "local";

  useEffect(() => {
    getMonthData(activeMonth).then(d => {
      setMessages(d.consultant.messages || []);
      setMonthData(d);
    });
    if (aiMode === "online") checkAIAvailable().then(setAiOnline);
  }, [activeMonth, aiMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ConsultantMessage = { id: generateId(), role: "user", content: input, createdAt: Date.now() };
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
      const assistantMsg: ConsultantMessage = { id: generateId(), role: "assistant", content: reply, createdAt: Date.now(), aiMode };
      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs);
      const d = await getMonthData(activeMonth);
      await saveMonthData({ ...d, consultant: { ...d.consultant, messages: finalMsgs }, updatedAt: Date.now() });
    } catch (err) {
      const errMsg: ConsultantMessage = { id: generateId(), role: "assistant", content: `Erro: ${err instanceof Error ? err.message : "Tente novamente."}`, createdAt: Date.now() };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const startRecording = () => {
    setRecordingError("");
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecordingError("Seu navegador não suporta reconhecimento de voz. Use o Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript + " ";
      }
      if (transcript) setInput(prev => prev ? prev + " " + transcript.trim() : transcript.trim());
    };
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === "not-allowed") setRecordingError("Permissão de microfone negada. Habilite nas configurações do navegador.");
      else setRecordingError("Erro ao gravar. Tente novamente.");
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = async () => {
    recognitionRef.current?.stop();
    setIsRecording(false);

    // Aguarda um momento para o texto final ser capturado
    await new Promise(r => setTimeout(r, 500));

    setInput(current => {
      if (!current.trim() || !aiOnline) return current;
      // Inicia pontuação em background
      setIsPunctuating(true);
      addPunctuation(current).then(punctuated => {
        setInput(punctuated);
        setIsPunctuating(false);
      });
      return current;
    });
  };

  const statusOnline = aiMode === "online" && aiOnline;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", gap: 12 }}>

      <div style={{ padding: "8px 14px", background: statusOnline ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${statusOnline ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`, borderRadius: 8, fontSize: 12, color: statusOnline ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        <span>{statusOnline ? "🤖 IA Online (Claude) — com acesso aos seus dados do mês" : "🧠 Consultor Local (offline)"}</span>
        {statusOnline && monthData && <span style={{ fontSize: 11, opacity: 0.8 }}>{monthData.expenses.length} despesas · {monthData.incomes.length} receitas carregadas</span>}
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
            {statusOnline ? "💡 Pergunte sobre seus gastos, peça análises ou dicas de economia!" : "Envie uma mensagem para começar"}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 10, fontSize: 14, lineHeight: 1.7, background: m.role === "user" ? "var(--primary)" : "var(--bg-secondary)", color: "var(--text)", border: m.role === "assistant" ? "1px solid var(--border)" : "none", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: 14, color: "var(--text-secondary)" }}>⏳ Dr. Ricardo está analisando...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {recordingError && (
        <div style={{ fontSize: 12, color: "var(--danger)", padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>❌ {recordingError}</div>
      )}

      {isRecording && (
        <div style={{ fontSize: 12, color: "#ef4444", padding: "6px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
          🔴 Gravando... fale normalmente. Clique em ⏹️ quando terminar.
        </div>
      )}

      {isPunctuating && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 10px", background: "var(--bg-secondary)", borderRadius: 6 }}>
          ✍️ Adicionando pontuação automaticamente...
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-secondary)", paddingLeft: 2 }}>
        💡 Enter para enviar · Shift+Enter para nova linha
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={statusOnline ? "Ex: Onde estou gastando mais? Como economizar?" : "Pergunte sobre suas finanças..."}
          rows={3}
          style={{ flex: 1, padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, minHeight: 60, maxHeight: 160 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {!isRecording ? (
            <button onClick={startRecording} title="Iniciar gravação de voz" style={{ width: 44, height: 44, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              🎤
            </button>
          ) : (
            <button onClick={stopRecording} title="Parar gravação" style={{ width: 44, height: 44, background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ⏹️
            </button>
          )}
          <button onClick={send} disabled={isLoading || !input.trim() || isPunctuating} style={{ width: 44, height: 44, background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: isLoading || !input.trim() || isPunctuating ? 0.5 : 1 }}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
