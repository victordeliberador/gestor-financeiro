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
    if (!res.ok) { 
      const e = await res.json().catch(() => ({})); 
      throw new Error(e.message || `Erro ${res.status}`); 
    }
    const data = await res.json();
    return data.reply;
  } catch (err) {
    clearTimeout(id);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timeout: servidor demorou muito.");
    }
    throw err;
  }
}

export async function checkAIAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { method: "GET" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok" && data.aiAvailable === true;
  } catch {
    return false;
  }
}