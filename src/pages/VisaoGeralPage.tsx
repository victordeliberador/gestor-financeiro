import React, { useEffect, useState } from "react";
import { useApp } from "../app/AppProvider";
import { formatCurrency, getLastNMonths } from "../domain/helpers";
import type { MonthData } from "../domain/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const RAD = Math.PI / 180;

type PieItem = { name: string; valueCents: number };

export default function VisaoGeralPage() {
  const { activeMonth, getMonthData, loadAllMonths, allMonths } = useApp();
  const [current, setCurrent] = useState<MonthData | null>(null);

  useEffect(() => {
    getMonthData(activeMonth).then(setCurrent);
    loadAllMonths();
  }, [activeMonth]);

  if (!current) return <div style={{ color: "var(--text-secondary)" }}>Carregando...</div>;

  const totalIncome = current.incomes.reduce((s, i) => s + i.amountCents, 0);
  const totalExpense = current.expenses.reduce((s, e) => s + e.amountCents, 0);
  const balance = totalIncome - totalExpense;

  const months6 = getLastNMonths(activeMonth, 6);
  const chartData = months6.map((m) => {
    const md = allMonths.find((x) => x.month === m);
    return {
      month: m.substring(5),
      receitas: md ? md.incomes.reduce((s, i) => s + i.amountCents, 0) / 100 : 0,
      despesas: md ? md.expenses.reduce((s, e) => s + e.amountCents, 0) / 100 : 0,
    };
  });

  const categoryTotals = current.expenses.reduce((acc, e) => {
    const cat = e.categoryMain || "Sem categoria";
    acc[cat] = (acc[cat] || 0) + e.amountCents;
    return acc;
  }, {} as Record<string, number>);

  const pieData: PieItem[] = Object.entries(categoryTotals)
    .map(([name, valueCents]) => ({ name, valueCents }))
    .sort((a, b) => b.valueCents - a.valueCents)
    .slice(0, 8);

  const totalPieCents = pieData.reduce((s, d) => s + d.valueCents, 0);

  // Label com “flechas” + Nome + Percentual
  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, fill, payload, value } = props;
    if (!totalPieCents || !value) return null;

    const pct = (Number(value) / totalPieCents) * 100;
    // Se quiser esconder fatias muito pequenas, descomente:
    // if (pct < 4) return null;

    const sx = cx + (outerRadius + 6) * Math.cos(-midAngle * RAD);
    const sy = cy + (outerRadius + 6) * Math.sin(-midAngle * RAD);

    const mx = cx + (outerRadius + 18) * Math.cos(-midAngle * RAD);
    const my = cy + (outerRadius + 18) * Math.sin(-midAngle * RAD);

    const ex = mx + (mx > cx ? 18 : -18);
    const ey = my;

    const textAnchor = mx > cx ? "start" : "end";
    const label = `${payload?.name ?? ""} ${pct.toFixed(1)}%`;

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={sx} cy={sy} r={2} fill={fill} />
        <text
          x={ex + (mx > cx ? 6 : -6)}
          y={ey}
          textAnchor={textAnchor}
          dominantBaseline="central"
          style={{ fill: "var(--text)", fontSize: 12, fontWeight: 600 }}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        {[
          { label: "Receitas", value: formatCurrency(totalIncome), color: "#10b981" },
          { label: "Despesas", value: formatCurrency(totalExpense), color: "#ef4444" },
          { label: "Saldo", value: formatCurrency(Math.abs(balance)), color: balance >= 0 ? "#3b82f6" : "#ef4444" },
        ].map((c) => (
          <div key={c.label} style={{ padding: 20, background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: 20, background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Evolução 6 Meses</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12 }} />
              <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ padding: 20, background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Despesas por Categoria</div>

          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                <Pie
                  data={pieData}
                  dataKey="valueCents"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={2}
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(v: any) => formatCurrency(Number(v))}
                  contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Adicione despesas para ver o gráfico</div>
          )}
        </div>
      </div>
    </div>
  );
}
