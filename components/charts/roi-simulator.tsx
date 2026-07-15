"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { eur } from "@/lib/metrics";

const GREEN = "#16a34a";
const ZINC = "#a1a1aa";

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <span className="text-sm font-bold text-zinc-900 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-green-600 cursor-pointer"
      />
    </div>
  );
}

// Interactive break-even simulation: drag the levers, watch the payoff curve.
// Seeds come from the concept's own €-figures; the user can explore from there.
export function RoiSimulator({ setup: setupSeed, monthly: monthlySeed }: { setup: number; monthly: number }) {
  const monthlyMax = Math.max(20000, Math.ceil((monthlySeed * 2) / 500) * 500);
  const setupMax = Math.max(30000, Math.ceil((setupSeed * 2) / 1000) * 1000);

  const [setup, setSetup] = useState(setupSeed);
  const [monthly, setMonthly] = useState(monthlySeed);
  const [months, setMonths] = useState(24);
  const [cons, setCons] = useState(60); // conservative scenario as % of expected saving

  const data = useMemo(() => {
    const arr = [];
    for (let m = 0; m <= months; m++) {
      arr.push({
        m,
        erwartet: Math.round(monthly * m - setup),
        konservativ: Math.round(monthly * (cons / 100) * m - setup),
      });
    }
    return arr;
  }, [setup, monthly, months, cons]);

  const breakEven = monthly > 0 ? Math.ceil(setup / monthly) : null;
  const netEnd = monthly * months - setup;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-green-600" strokeWidth={2} />
        <h2 className="text-base font-semibold text-zinc-900">ROI-Simulation</h2>
      </div>
      <p className="text-xs text-zinc-400 mb-5">Wann amortisiert sich die Investition? Regler ziehen zum Durchspielen.</p>

      {/* Levers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-5">
        <Slider label="Einmalige Investition" value={setup} min={0} max={setupMax} step={500}
          onChange={setSetup} format={eur} />
        <Slider label="Einsparung / Monat" value={monthly} min={0} max={monthlyMax} step={250}
          onChange={setMonthly} format={eur} />
        <Slider label="Zeitraum" value={months} min={6} max={48} step={1}
          onChange={setMonths} format={v => `${v} Monate`} />
        <Slider label="Konservatives Szenario" value={cons} min={30} max={100} step={5}
          onChange={setCons} format={v => `${v} %`} />
      </div>

      {/* Chart */}
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f3" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }}
              tickFormatter={v => `${v}M`} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} width={44}
              tickFormatter={v => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
            <Tooltip
              formatter={(v, name) => [eur(Number(v)), name === "erwartet" ? "Erwartet" : "Konservativ"]}
              labelFormatter={l => `Monat ${l}`}
              contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
            />
            <ReferenceLine y={0} stroke="#d4d4d8" strokeWidth={1} />
            {breakEven != null && breakEven <= months && (
              <ReferenceLine x={breakEven} stroke={GREEN} strokeDasharray="4 4"
                label={{ value: `Break-even · Monat ${breakEven}`, position: "insideTopRight", fill: GREEN, fontSize: 11, fontWeight: 600 }} />
            )}
            <Area type="monotone" dataKey="konservativ" stroke={ZINC} strokeWidth={1.5} strokeDasharray="5 4" fill="none" dot={false} />
            <Area type="monotone" dataKey="erwartet" stroke={GREEN} strokeWidth={2.5} fill="url(#roiFill)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Read-outs */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { k: "Break-even", v: breakEven != null ? `Monat ${breakEven}` : "—" },
          { k: `Netto nach ${months} Mon.`, v: eur(netEnd), pos: netEnd >= 0 },
          { k: "Investition", v: eur(setup) },
        ].map(({ k, v, pos }) => (
          <div key={k} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
            <div className="text-[10px] tracking-wide text-zinc-400 uppercase mb-0.5 truncate">{k}</div>
            <div className={`text-sm font-bold tabular-nums ${pos === false ? "text-zinc-500" : "text-zinc-900"}`}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
