import React, { useState, useEffect } from "react";
import { useApp } from "../app/AppProvider";
import { sendChatMessage, checkAIAvailable } from "../services/aiClient";
import { generateId } from "../domain/helpers";
import type { ConsultantMessage } from "../domain/types";

export default function ConsultorPage() {
  const { activeMonth, getMonthData, saveMonthData, settings } = useApp();
  const [messages, setMessages] = useState<ConsultantMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiOnline, setAiOnline] = useState(false);
  const aiMode = settings?.aiMode || "local";

  useEffect(() => {
    getMonthData(activeMonth).then(d => setMessages(d.consultant.messages || []));
    if (aiMode === "online") checkAIAvailable().then(setAiOnline);
  }, [activeMonth, aiMode]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ConsultantMessage = { id: generateId(), role: "user", content: input, createdAt: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);
    try {
      let reply: string;
      if (aiMode === "online" && aiOnline) {
        reply = await sendChatMessage(newMsgs.map(m => ({ role: m.role, content: m.content })));
      } else {
        reply = `**Consultor Local** (offline)\n\nAnalisando suas financas do mes... Para respostas com IA, ative o modo Online nas configuracoes e certifique-se que o servidor esta rodando.`;
      }
      const assistantMsg: ConsultantMessage = { id: generateId(), role: "assistant", content: reply, createdAt: Date.now(), aiMode };
      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs);
      const d = await getMonthData(activeMonth);
      await saveMonthData({ ...d, consultant: { ...d.consultant, messages: finalMsgs }, updatedAt: Date.now() });
    } catch (err) {
      const errMsg: ConsultantMessage = { id: generateId(), role: "assistant", content: `Erro: ${err instanceof Error ? err.message : "Tente novamente."}`, createdAt: Date.now() };
      setMessages(prev => [...prev, errMsg]);
    } finally { setIsLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", gap: 12 }}>
      <div style={{ padding: "8px 14px", background: aiMode === "online" && aiOnline ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${aiMode === "online" && aiOnline ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`, borderRadius: 8, fontSize: 12, color: aiMode === "online" && aiOnline ? "#10b981" : "#f59e0b" }}>
        {aiMode === "online" && aiOnline ? "ðŸ¤– IA Online (Claude)" : "ðŸ’» Consultor Local (offline)"}
      </div>
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Envie uma mensagem para comecar</div>}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 10, fontSize: 14, lineHeight: 1.6, background: m.role === "user" ? "var(--primary)" : "var(--bg-secondary)", color: "var(--text)", border: m.role === "assistant" ? "1px solid var(--border)" : "none" }}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>â³ Processando...</div>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Pergunte sobre suas financas..." style={{ flex: 1, padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none" }} />
        <button onClick={send} disabled={isLoading || !input.trim()} style={{ padding: "10px 20px", background: "var(--primary)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, opacity: isLoading || !input.trim() ? 0.5 : 1 }}>Enviar</button>
      </div>
    </div>
  );
}
