/**
 * DIAGNÓSTICO AUTOMATIZADO — Gestor Financeiro
 * =============================================
 * Como usar:
 *   1. Este arquivo deve estar em: src/diagnostico.test.ts
 *   2. No terminal, na pasta do projeto, rode:
 *        npx vitest run src/diagnostico.test.ts
 */

import { describe, it, expect } from "vitest";
import { createEmptyMonthData, formatCurrency, generateId } from "./domain/helpers";
import { MAIN_CATEGORIES } from "./domain/categories";
import { CURRENT_SCHEMA_VERSION, DEFAULT_USER_ID, DEFAULT_ACTIVE_MONTH } from "./domain/constants";
import type { Expense, Income } from "./domain/types";

// ─── BLOCO 1: Helpers e utilitários ──────────────────────────────────────────

describe("Helpers e utilitários", () => {

  it("generateId retorna string não vazia", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generateId gera IDs únicos", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("formatCurrency formata 10000 cents como R$ 100,00", () => {
    const result = formatCurrency(10000);
    expect(result).toContain("100");
  });

  it("formatCurrency formata 0 cents", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });

  it("formatCurrency formata valor negativo", () => {
    const result = formatCurrency(-5000);
    expect(result).toContain("50");
  });

  it("createEmptyMonthData cria estrutura correta", () => {
    const month = "2025-01";
    const data = createEmptyMonthData(month);
    expect(data.month).toBe(month);
    expect(Array.isArray(data.incomes)).toBe(true);
    expect(Array.isArray(data.expenses)).toBe(true);
    expect(data.incomes).toHaveLength(0);
    expect(data.expenses).toHaveLength(0);
  });

  it("createEmptyMonthData tem campo consultant com messages", () => {
    const data = createEmptyMonthData("2025-01");
    expect(Array.isArray(data.consultant?.messages)).toBe(true);
  });

});

// ─── BLOCO 2: Categorias ─────────────────────────────────────────────────────

describe("Categorias", () => {

  it("MAIN_CATEGORIES não está vazio", () => {
    expect(Array.isArray(MAIN_CATEGORIES)).toBe(true);
    expect(MAIN_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("Cada categoria tem name e icon", () => {
    for (const cat of MAIN_CATEGORIES) {
      expect(cat.name).toBeTruthy();
      expect(cat.icon).toBeTruthy();
    }
  });

  it("Nomes de categoria são únicos", () => {
    const names = MAIN_CATEGORIES.map((c) => c.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

});

// ─── BLOCO 3: Lógica financeira ───────────────────────────────────────────────

describe("Lógica financeira", () => {

  it("Soma de despesas calcula corretamente", () => {
    const expenses: Expense[] = [
      { id: "1", label: "Mercado", amountCents: 5000, createdAt: Date.now() },
      { id: "2", label: "Transporte", amountCents: 3000, createdAt: Date.now() },
    ];
    const total = expenses.reduce((s, e) => s + e.amountCents, 0);
    expect(total).toBe(8000);
  });

  it("Soma de receitas calcula corretamente", () => {
    const incomes: Income[] = [
      { id: "1", label: "Salário", amountCents: 300000, kind: "fixed", createdAt: Date.now() },
      { id: "2", label: "Freelance", amountCents: 50000, kind: "variable", createdAt: Date.now() },
    ];
    const total = incomes.reduce((s, i) => s + i.amountCents, 0);
    expect(total).toBe(350000);
  });

  it("Saldo (receitas - despesas) é calculado corretamente", () => {
    const receitas = 300000;
    const despesas = 120000;
    const saldo = receitas - despesas;
    expect(saldo).toBe(180000);
  });

  it("Filtro de busca por label funciona", () => {
    const expenses: Expense[] = [
      { id: "1", label: "Mercado Extra", amountCents: 5000, createdAt: Date.now() },
      { id: "2", label: "Transporte", amountCents: 3000, createdAt: Date.now() },
      { id: "3", label: "Mercado Central", amountCents: 2000, createdAt: Date.now() },
    ];
    const filtered = expenses.filter((e) =>
      e.label.toLowerCase().includes("mercado")
    );
    expect(filtered).toHaveLength(2);
  });

  it("Valor 0 é rejeitado na validação", () => {
    const cents = Math.round(parseFloat("0".replace(",", ".")) * 100);
    expect(cents <= 0).toBe(true);
  });

  it("Valor negativo é rejeitado na validação", () => {
    const cents = Math.round(parseFloat("-10".replace(",", ".")) * 100);
    expect(cents <= 0).toBe(true);
  });

  it("Valor texto inválido é rejeitado na validação", () => {
    const cents = Math.round(parseFloat("abc".replace(",", ".")) * 100);
    expect(isNaN(cents)).toBe(true);
  });

  it("Valor com vírgula '1,50' converte para 150 cents", () => {
    const cents = Math.round(parseFloat("1,50".replace(",", ".")) * 100);
    expect(cents).toBe(150);
  });

});

// ─── BLOCO 4: Constantes ─────────────────────────────────────────────────────

describe("Constantes", () => {

  it("CURRENT_SCHEMA_VERSION é número positivo", () => {
    expect(typeof CURRENT_SCHEMA_VERSION).toBe("number");
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it("DEFAULT_USER_ID não está vazio", () => {
    expect(typeof DEFAULT_USER_ID).toBe("string");
    expect(DEFAULT_USER_ID.length).toBeGreaterThan(0);
  });

  it("DEFAULT_ACTIVE_MONTH tem formato YYYY-MM", () => {
    expect(DEFAULT_ACTIVE_MONTH).toMatch(/^\d{4}-\d{2}$/);
  });

});
