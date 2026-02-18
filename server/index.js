import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "200kb" }));

// Garantir que pasta uploads existe
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png","image/jpeg","image/jpg","image/webp","application/pdf"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Tipo nao permitido"));
  }
});

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.warn("\n[AVISO] ANTHROPIC_API_KEY nao configurada - IA offline\n");
}
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const APP_CATEGORIES = [
  "Moradia","Alimentacao","Transporte e Mobilidade","Saude",
  "Educacao e Desenvolvimento","Familia e Criancas","Contas e Assinaturas",
  "Cuidados Pessoais","Compras e Vida Domestica","Lazer e Cultura","Pets",
  "Dividas e Obrigacoes","Impostos e Taxas","Seguros e Protecao",
  "Doacoes e Solidariedade","Investimentos e Reserva","Despesas Eventuais",
  "Transferencias e Ajustes","Advocacia"
];

const SYSTEM_PROMPT_CHAT = `Voce e um consultor financeiro educativo para um app de gestao financeira pessoal.
Seja conciso (max 300 palavras), use markdown simples, liste acoes praticas.
Nunca prometa retornos garantidos. Diga sempre: orientacao geral, nao substitui consultoria profissional.`;

const SYSTEM_PROMPT_EXTRACT = `Voce e especialista em extrair transacoes financeiras de imagens e PDFs de extratos bancarios.
Categorias disponiveis: ${APP_CATEGORIES.join(", ")}.
Regras: confidence < 0.65 = categoryMain/categorySub null. Valores em centavos (amountCents). Negativos = expense, positivos = income.
Retorne APENAS JSON valido sem markdown:
{"transactions":[{"date":"YYYY-MM-DD","description":"string","amountCents":12345,"kind":"expense|income","suggested":{"categoryMain":"string|null","categorySub":"string|null","confidence":0.0}}]}`;

const rateLimitMap = new Map();
function checkRateLimit(id, limit = 20) {
  const now = Date.now();
  const reqs = (rateLimitMap.get(id) || []).filter(t => now - t < 60000);
  if (reqs.length >= limit) return false;
  reqs.push(now);
  rateLimitMap.set(id, reqs);
  return true;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiAvailable: !!anthropic, timestamp: new Date().toISOString() });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    if (!anthropic) return res.status(503).json({ error: "IA nao disponivel" });
    if (!checkRateLimit(req.ip || "anon", 20)) return res.status(429).json({ error: "Rate limit excedido" });
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages obrigatorio" });
    const claudeMessages = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
    if (context?.monthSummary) {
      const s = context.monthSummary;
      claudeMessages.unshift({ role: "user", content: `Contexto: Receitas R$${(s.totalIncomes/100).toFixed(2)}, Despesas R$${(s.totalExpenses/100).toFixed(2)}, Saldo R$${(s.balance/100).toFixed(2)}` });
    }
  const requestOptions = isPDF
  ? { headers: { "anthropic-beta": "pdfs-2024-09-25" } }
  : undefined;

const response = await anthropic.messages.create(
  {
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT_EXTRACT,
    messages: [{ role: "user", content: [contentBlock, { type: "text", text: "Extraia todas as transacoes e retorne JSON." }] }]
  },
  requestOptions
);

    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error("[Chat]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/import/extract", upload.single("file"), async (req, res) => {
  let filePath = null;
  try {
    if (!anthropic) return res.status(503).json({ error: "IA nao disponivel" });
    if (!checkRateLimit(req.ip || "anon", 5)) return res.status(429).json({ error: "Rate limit excedido" });
    if (!req.file) return res.status(400).json({ error: "Arquivo nao enviado" });
    filePath = req.file.path;
    const base64Data = fs.readFileSync(filePath).toString("base64");
    const isPDF = req.file.mimetype === "application/pdf";
    const contentBlock = isPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
      : { type: "image", source: { type: "base64", media_type: req.file.mimetype, data: base64Data } };
   const requestOptions = isPDF
  ? { headers: { "anthropic-beta": "pdfs-2024-09-25" } }
  : undefined;

const response = await anthropic.messages.create(
  {
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT_EXTRACT,
    messages: [{ role: "user", content: [contentBlock, { type: "text", text: "Extraia todas as transacoes e retorne JSON." }] }]
  },
  requestOptions
);
    fs.unlinkSync(filePath);
    filePath = null;
    let text = response.content[0].text.trim().replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
    const data = JSON.parse(text);
    if (!Array.isArray(data.transactions)) throw new Error("Formato invalido");
    console.log(`[Import] ${data.transactions.length} transacoes extraidas`);
    res.json(data);
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("[Import]", err.message);
    res.status(500).json({ error: err.message || "Erro ao processar arquivo" });
  }
});

app.listen(PORT, () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`IA: ${anthropic ? "ONLINE" : "OFFLINE"}`);
  console.log(`${"=".repeat(50)}\n`);
});
