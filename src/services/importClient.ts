import type { ExtractedTransaction } from "../domain/types";

const API_URL = import.meta.env.VITE_API_URL || "";

export async function extractTransactions(file: File): Promise<ExtractedTransaction[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60000);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/api/import/extract`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
    clearTimeout(id);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || e.message || `Erro ${res.status}`);
    }
    const data = await res.json();
    return data.transactions || [];
  } catch (err) {
    clearTimeout(id);
    if (err instanceof Error && err.name === "AbortError")
      throw new Error("Timeout: processamento demorou muito.");
    throw err;
  }
}