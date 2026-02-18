# ============================================================
# GESTOR FINANCEIRO - Bootstrap Parte 1/3 [CORRIGIDO]
# Configs raiz + server/ completo
# Rodar de: C:\Users\Usuario\gestor-financeiro\
# ============================================================
Write-Host "=== Bootstrap 1/3 - Configs + Server ===" -ForegroundColor Cyan

# ---- vite.config.ts ----------------------------------------
Set-Content -Path "vite.config.ts" -Encoding UTF8 -Value @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      devOptions: { enabled: true },
      manifest: {
        name: "Gestor Financeiro",
        short_name: "GestorFin",
        description: "Gestao financeira pessoal e profissional",
        theme_color: "#3b82f6",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            {
  urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
  handler: "NetworkFirst",
  options: {
    cacheName: "api-cache",
    networkTimeoutSeconds: 10,
    expiration: { maxEntries: 50, maxAgeSeconds: 300 }
  }
}

        ]
      }
    })
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  }
});
'@

# ---- tsconfig.json -----------------------------------------
Set-Content -Path "tsconfig.json" -Encoding UTF8 -Value @'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
'@

# ---- tsconfig.app.json -------------------------------------
Set-Content -Path "tsconfig.app.json" -Encoding UTF8 -Value @'
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
'@

# ---- tsconfig.node.json ------------------------------------
Set-Content -Path "tsconfig.node.json" -Encoding UTF8 -Value @'
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
'@

# ---- index.html --------------------------------------------
Set-Content -Path "index.html" -Encoding UTF8 -Value @'
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#3b82f6" />
    <title>Gestor Financeiro</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'@

# ---- .env.example ------------------------------------------
Set-Content -Path ".env.example" -Encoding UTF8 -Value @'
# Copie este arquivo para .env e preencha com sua chave real
ANTHROPIC_API_KEY=sk-ant-api03-COLOQUE_SUA_CHAVE_AQUI
PORT=3001
'@

# ---- .gitignore --------------------------------------------
Set-Content -Path ".gitignore" -Encoding UTF8 -Value @'
node_modules
dist
.env
*.local
server/node_modules
server/uploads
'@

# ---- public/ + ícones PNG offline (sem web) ----------------
New-Item -ItemType Directory -Force -Path "public" | Out-Null

Add-Type -AssemblyName System.Drawing

function New-IconPng {
  param([string]$Path, [int]$Size)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $bg = [System.Drawing.ColorTranslator]::FromHtml("#3b82f6")
  $g.Clear($bg)

  $fontSize = [int]($Size * 0.55)
  $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

  $g.DrawString('$', $font, [System.Drawing.Brushes]::White, ($Size/2), ($Size/2), $sf)
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose(); $bmp.Dispose()
}

New-IconPng "public\icon-192.png" 192
New-IconPng "public\icon-512.png" 512
Write-Host "  [OK] Icones PNG criados offline" -ForegroundColor Green

# ============================================================
# SERVER
# ============================================================
New-Item -ItemType Directory -Force -Path "server" | Out-Null
New-Item -ItemType Directory -Force -Path "server\uploads" | Out-Null

Set-Content -Path "server\package.json" -Encoding UTF8 -Value @'
{
  "name": "gestor-financeiro-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "multer": "^1.4.5-lts.1"
  }
}
'@

Set-Content -Path "server\index.js" -Encoding UTF8 -Value @'
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
'@

Write-Host "  [OK] server/ criado" -ForegroundColor Green
Write-Host ""
Write-Host "Parte 1/3 concluida!" -ForegroundColor Cyan
Write-Host "Proximo passo: execute bootstrap-2-CORRIGIDO.ps1" -ForegroundColor Yellow