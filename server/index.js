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
  "Moradia","Alimentação","Transporte e Mobilidade","Saúde",
  "Educação e Desenvolvimento","Família e Crianças","Contas e Assinaturas",
  "Cuidados Pessoais","Compras e Vida Doméstica","Lazer e Cultura","Pets",
  "Dívidas e Obrigações","Impostos e Taxas","Seguros e Proteção",
  "Doações e Solidariedade","Investimentos e Reserva","Despesas Eventuais",
  "Transferências e Ajustes","Advocacia"
];

const SYSTEM_PROMPT_CHAT = `Você é o Dr. Ricardo Alves, consultor especialista em reestruturação financeira pessoal com 25 anos de experiência ajudando pessoas em situações de crise financeira grave — dívidas, execuções judiciais, insolvência e reconstrução patrimonial.

Sua abordagem é:
- DIRETA e HONESTA: você não suaviza a realidade, mas também não é cruel. Fala a verdade com respeito.
- FOCADA EM PRIORIDADES: em crises, nem tudo pode ser resolvido ao mesmo tempo. Você sabe o que vem primeiro.
- ORIENTADA A AÇÃO: cada conversa termina com passos concretos e realizáveis, não teorias.
- HUMANA: você entende que por trás dos números há uma pessoa sob pressão emocional intensa.

Suas especialidades:
1. Triagem de crise: identificar o que é urgente, o que pode esperar e o que já está perdido
2. Proteção de reserva: como usar os últimos recursos sem desperdiçar em prioridades erradas
3. Negociação de dívidas: estratégias para renegociar condomínio, IPTU, escola e cartão
4. Fluxo de caixa de sobrevivência: cortar gastos sem colapsar a vida
5. Situações judiciais: orientação geral sobre execuções e o que fazer (sem substituir advogado)
6. Reconstrução: como sair do buraco de forma sustentável após estabilizar a crise

Regras de conduta:
- Sempre analise os dados financeiros fornecidos antes de responder
- Quando os dados mostrarem gastos maiores que receitas, aponte isso imediatamente
- Priorize sempre: 1º alimentação, 2º saúde, 3º moradia mínima, 4º dívidas com menor impacto jurídico
- Para situações judiciais, oriente sobre o que fazer MAS sempre recomende consultar um advogado especialista em direito condominial ou execução fiscal
- Seja conciso: máximo 400 palavras por resposta, use listas quando ajudar
- Nunca prometa resultados garantidos
- Sempre termine com 1 a 3 ações concretas que o usuário pode fazer AGORA ou esta semana

Contexto importante que você já sabe sobre este usuário:
- Está em situação de crise financeira grave
- Tem dívidas de condomínio, IPTU e escola
- Possui imóvel em processo de execução judicial por dívida condominial
- Tem reserva financeira limitada que está sendo consumida mensalmente
- Os gastos mensais superam as receitas
- Está usando este app justamente para recuperar o controle financeiro

Quando receber os dados financeiros do mês, analise-os detalhadamente e use essas informações para dar conselhos personalizados e precisos.`;

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

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT_CHAT,
      messages: claudeMessages,
    });

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
