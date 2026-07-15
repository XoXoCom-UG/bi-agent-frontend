"use client";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, LabelList,
  PieChart, Pie, Tooltip, Legend,
} from "recharts";
import { ArrowDownRight } from "lucide-react";
import type { BeforeAfter, EffortMix } from "@/lib/metrics";
import { eur } from "@/lib/metrics";

const GREEN = "#16a34a";
const ZINC = "#d4d4d8";

function fmt(v: number, unit: string): string {
  if (unit === "€") return eur(v);
  if (unit === "%") return `${Math.round(v)}%`;
  if (unit === "h") return `${Math.round(v)}h`;
  return `${Math.round(v)}`;
}

function MiniBeforeAfter({ item }: { item: BeforeAfter }) {
  const data = [
    { name: "Vorher", val: item.before },
    { name: "Nachher", val: item.after },
  ];
  const drop = item.before > 0 ? Math.round(((item.before - item.after) / item.before) * 100) : 0;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-zinc-600">{item.label}</span>
        {drop > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-green-700 bg-green-50 rounded-full px-1.5 py-0.5">
            <ArrowDownRight className="w-3 h-3" strokeWidth={2.5} />{drop}%
          </span>
        )}
      </div>
      <div className="h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 6, bottom: 0, left: 6 }} barCategoryGap="30%">
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }} />
            <Bar dataKey="val" radius={[6, 6, 0, 0]} isAnimationActive>
              <Cell fill={ZINC} />
              <Cell fill={GREEN} />
              <LabelList dataKey="val" position="top" fontSize={12} fontWeight={700}
                fill="#3f3f46" formatter={(v) => fmt(Number(v), item.unit)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BeforeAfterGrid({ items }: { items: BeforeAfter[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs tracking-widest text-zinc-400 uppercase mb-3 px-1">Vorher / Nachher</p>
      <div className={`grid gap-4 ${items.length >= 3 ? "sm:grid-cols-3" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
        {items.map(it => <MiniBeforeAfter key={it.label} item={it} />)}
      </div>
    </div>
  );
}

const EFFORT_COLORS: Record<string, string> = { S: "#86efac", M: "#22c55e", L: "#15803d" };
const EFFORT_LABEL: Record<string, string> = { S: "Klein", M: "Mittel", L: "Groß" };

export function EffortPie({ mix }: { mix: EffortMix }) {
  const data = (["S", "M", "L"] as const)
    .map(k => ({ key: k, name: EFFORT_LABEL[k], value: mix[k] }))
    .filter(d => d.value > 0);
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Aufwandsverteilung</h2>
      <p className="text-xs text-zinc-400 mb-3">{total} Maßnahmen nach Umsetzungsaufwand</p>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map(d => <Cell key={d.key} fill={EFFORT_COLORS[d.key]} />)}
            </Pie>
            <Tooltip
              formatter={(v, n) => [`${Number(v)} Maßnahmen`, n]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 12 }}
            />
            <Legend iconType="circle" formatter={v => <span style={{ fontSize: 12, color: "#52525b" }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
