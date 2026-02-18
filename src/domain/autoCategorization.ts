import type { AutoCategorizationRule } from "./types";

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
}

function matchesRule(description: string, rule: AutoCategorizationRule): boolean {
  if (!rule.enabled) return false;
  const norm = normalizeText(description);
  if (rule.matchType === "contains") {
    return rule.keywords.some(k => norm.includes(normalizeText(k)));
  }
  if (rule.matchType === "regex" && rule.regex) {
    try { return new RegExp(rule.regex, "i").test(description); } catch { return false; }
  }
  return false;
}

export function applyAutoCategorization(description: string, rules: AutoCategorizationRule[]) {
  const sorted = rules.filter(r => r.enabled).sort((a,b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (matchesRule(description, rule)) {
      return { categoryMain: rule.applies.categoryMain, categorySub: rule.applies.categorySub,
        scope: rule.applies.scope, paymentMethod: rule.applies.paymentMethod,
        matchedRule: rule, confidence: 0.9 };
    }
  }
  return { confidence: 0 };
}

export function testRule(rule: AutoCategorizationRule, testText: string) {
  const matches = matchesRule(testText, rule);
  return matches ? { matches: true, result: { categoryMain: rule.applies.categoryMain, categorySub: rule.applies.categorySub } } : { matches: false };
}

export function validateRule(rule: Partial<AutoCategorizationRule>): string | null {
  if (!rule.name?.trim()) return "Nome obrigatorio";
  if (rule.matchType === "contains" && (!rule.keywords || rule.keywords.length === 0)) return "Adicione pelo menos uma palavra-chave";
  if (rule.matchType === "regex") {
    if (!rule.regex?.trim()) return "Regex obrigatoria";
    try { new RegExp(rule.regex); } catch { return "Regex invalida"; }
  }
  if (!rule.applies || Object.keys(rule.applies).length === 0) return "Defina pelo menos uma categoria para aplicar";
  return null;
}
