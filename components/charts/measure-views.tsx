"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { RecommendedMeasure, MeasureCategory } from "@/lib/api";
import { LayoutGrid, Crosshair, GitBranch, Radar as RadarIcon, Wrench, Users, TrendingUp, ShieldCheck } from "lucide-react";

/*
 * Empfohlene Maßnahmen — the same ~10 measures rendered four ways, because a
 * decision is easier to make from a picture than from a wall of text:
 *   bento   → what matters most (size = impact)
 *   matrix  → what to do first (impact × effort quadrants)
 *   flow    → what unlocks what (depends_on)
 *   radar   → where this transformation is weighted (category mix)
 * Colour always means category, in every view.
 */

const CATS: Record<MeasureCategory, { label: string; color: string; tint: string; Icon: React.ElementType }> = {
  tooling:  { label: "Tooling",  color: "var(--cat-tooling)",  tint: "var(--cat-tooling-tint)",  Icon: Wrench },
  agile:    { label: "Agile",    color: "var(--cat-agile)",    tint: "var(--cat-agile-tint)",    Icon: Users },
  business: { label: "Business", color: "var(--cat-business)", tint: "var(--cat-business-tint)", Icon: TrendingUp },
  security: { label: "Security", color: "var(--cat-security)", tint: "var(--cat-security-tint)", Icon: ShieldCheck },
};
const CAT_KEYS = Object.keys(CATS) as MeasureCategory[];

const IMPACT_ORDER = { Low: 0, Medium: 1, High: 2 } as const;
const EFFORT_ORDER = { S: 0, M: 1, L: 2, XL: 3 } as const;

const cat = (m: RecommendedMeasure) => CATS[m.category] ?? CATS.tooling;
const impactIdx = (m: RecommendedMeasure) => IMPACT_ORDER[m.impact ?? "Medium"] ?? 1;
const effortIdx = (m: RecommendedMeasure) => EFFORT_ORDER[m.effort ?? "M"] ?? 1;

type ViewId = "bento" | "matrix" | "flow" | "radar";
const VIEWS: { id: ViewId; label: string; hint: string; Icon: React.ElementType }[] = [
  { id: "bento",  label: "Übersicht",     hint: "Größe = Wirkung",        Icon: LayoutGrid },
  { id: "matrix", label: "Priorisierung", hint: "Wirkung × Aufwand",      Icon: Crosshair },
  { id: "flow",   label: "Reihenfolge",   hint: "Was baut auf was auf",   Icon: GitBranch },
  { id: "radar",  label: "Schwerpunkte",  hint: "Verteilung je Kategorie", Icon: RadarIcon },
];

// ── shared bits ───────────────────────────────────────────────────────────────
function CatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {CAT_KEYS.map(k => (
        <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <i className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CATS[k].color }} />
          {CATS[k].label}
        </span>
      ))}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
      {children}
    </span>
  );
}

// ── A. Bento: card size encodes impact ────────────────────────────────────────
function BentoView({ measures }: { measures: RecommendedMeasure[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[104px] gap-3">
      {measures.map((m, i) => {
        const c = cat(m);
        const span =
          m.impact === "High" ? "col-span-2 row-span-2" :
          m.impact === "Low"  ? "col-span-1 row-span-1" :
                                "col-span-2 row-span-1";
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            title={m.description || m.title}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 flex flex-col justify-between",
              "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5",
              span
            )}
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: c.color }} />
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ background: c.tint, color: c.color }}>
                <c.Icon className="w-3 h-3" strokeWidth={2} />
                {c.label}
              </span>
            </div>
            <p className={cn("font-semibold text-zinc-900 dark:text-zinc-100 leading-snug",
              m.impact === "High" ? "text-sm" : "text-[12.5px]")}>
              {m.title}
            </p>
            {m.impact === "High" && m.description && (
              <p className="text-[11.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-3">{m.description}</p>
            )}
            <div className="flex gap-1.5">
              <Tag>Wirkung {m.impact ?? "—"}</Tag>
              <Tag>Aufwand {m.effort ?? "—"}</Tag>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── B. Matrix: impact × effort quadrants ──────────────────────────────────────
function MatrixView({ measures }: { measures: RecommendedMeasure[] }) {
  const W = 560, H = 400, L = 54, R = 18, T = 22, B = 46;
  const x0 = L, x1 = W - R, y0 = T, y1 = H - B;
  const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2;

  // Jitter overlapping dots apart so two measures in the same cell stay readable.
  const placed = useMemo(() => {
    const buckets = new Map<string, number>();
    return measures.map(m => {
      const key = `${effortIdx(m)}-${impactIdx(m)}`;
      const n = buckets.get(key) ?? 0;
      buckets.set(key, n + 1);
      const ring = Math.floor(n / 6), slot = n % 6;
      const rad = n === 0 ? 0 : 13 + ring * 12;
      const ang = (slot / 6) * Math.PI * 2;
      return {
        m,
        cx: x0 + (effortIdx(m) / 3) * (x1 - x0) + Math.cos(ang) * rad,
        cy: y1 - (impactIdx(m) / 2) * (y1 - y0) + Math.sin(ang) * rad,
      };
    });
  }, [measures, x0, x1, y0, y1]);

  const quads: { x: number; y: number; t: string; anchor: "start" | "end" }[] = [
    { x: x0 + 10,  y: y0 + 15, t: "Quick Wins", anchor: "start" },
    { x: x1 - 10,  y: y0 + 15, t: "Große Wetten", anchor: "end" },
    { x: x0 + 10,  y: y1 - 10, t: "Nebenbei", anchor: "start" },
    { x: x1 - 10,  y: y1 - 10, t: "Zurückstellen", anchor: "end" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="flex-1 min-w-0 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[440px]" role="img"
          aria-label="Maßnahmen nach Wirkung und Aufwand">
          <rect x={x0} y={y0} width={midX - x0} height={midY - y0} fill="var(--cat-tooling-tint)" opacity="0.45" />
          <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
          <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
          <line x1={midX} y1={y0} x2={midX} y2={y1} strokeDasharray="3 4" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
          <line x1={x0} y1={midY} x2={x1} y2={midY} strokeDasharray="3 4" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />

          {quads.map(q => (
            <text key={q.t} x={q.x} y={q.y} textAnchor={q.anchor}
              className="fill-zinc-400 dark:fill-zinc-500 text-[10px] font-bold uppercase"
              style={{ letterSpacing: "0.06em" }}>{q.t}</text>
          ))}

          <text x={x0 - 12} y={y0 + 6} textAnchor="end" className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-semibold">hoch</text>
          <text x={x0 - 12} y={y1} textAnchor="end" className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-semibold">niedrig</text>
          <text x={x0 - 34} y={midY} textAnchor="middle" transform={`rotate(-90 ${x0 - 34} ${midY})`}
            className="fill-zinc-400 dark:fill-zinc-500 text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>Wirkung</text>
          <text x={x0} y={y1 + 20} className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-semibold">wenig</text>
          <text x={x1} y={y1 + 20} textAnchor="end" className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-semibold">viel</text>
          <text x={midX} y={y1 + 33} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500 text-[10px] font-bold uppercase" style={{ letterSpacing: "0.08em" }}>Aufwand</text>

          {placed.map(({ m, cx, cy }, i) => (
            <g key={m.id}>
              <title>{`${m.title} — Wirkung ${m.impact ?? "—"}, Aufwand ${m.effort ?? "—"}`}</title>
              <circle cx={cx} cy={cy} r="14" fill={cat(m).color} opacity="0.14" />
              <circle cx={cx} cy={cy} r="8.5" fill={cat(m).color} />
              <text x={cx} y={cy + 3.2} textAnchor="middle" className="fill-white text-[9px] font-bold"
                style={{ pointerEvents: "none" }}>{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>

      <ol className="lg:w-[260px] shrink-0 space-y-1.5">
        {placed.map(({ m }, i) => (
          <li key={m.id} className="flex items-start gap-2 text-[12px] leading-snug" title={m.description || ""}>
            <span className="shrink-0 w-[18px] h-[18px] rounded-md grid place-items-center text-[9.5px] font-bold text-white mt-px"
              style={{ background: cat(m).color }}>{i + 1}</span>
            <span className="text-zinc-600 dark:text-zinc-300">{m.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── C. Flow: dependency layers from depends_on ────────────────────────────────
function FlowView({ measures }: { measures: RecommendedMeasure[] }) {
  const { cols, edges, hasDeps } = useMemo(() => {
    const byId = new Map(measures.map(m => [m.id, m]));
    const depthOf = new Map<string, number>();
    const resolve = (id: string, seen: Set<string>): number => {
      if (depthOf.has(id)) return depthOf.get(id)!;
      if (seen.has(id)) return 0;                       // cycle guard
      seen.add(id);
      const deps = (byId.get(id)?.depends_on ?? []).filter(d => byId.has(d));
      const v = deps.length ? Math.max(...deps.map(d => resolve(d, seen))) + 1 : 0;
      depthOf.set(id, v);
      return v;
    };
    measures.forEach(m => resolve(m.id, new Set()));

    const maxD = Math.max(0, ...[...depthOf.values()]);
    const cols: RecommendedMeasure[][] = Array.from({ length: maxD + 1 }, () => []);
    measures.forEach(m => cols[depthOf.get(m.id) ?? 0].push(m));
    const edges = measures.flatMap(m =>
      (m.depends_on ?? []).filter(d => byId.has(d)).map(d => ({ from: d, to: m.id }))
    );
    return { cols, edges, hasDeps: edges.length > 0 };
  }, [measures]);

  const NW = 168, NH = 52, GAPX = 56, GAPY = 14;
  const rows = Math.max(...cols.map(c => c.length), 1);
  const W = cols.length * NW + (cols.length - 1) * GAPX + 8;
  const H = rows * NH + (rows - 1) * GAPY + 8;

  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((col, ci) => {
    const colH = col.length * NH + (col.length - 1) * GAPY;
    col.forEach((m, ri) => {
      pos.set(m.id, { x: 4 + ci * (NW + GAPX), y: 4 + (H - 8 - colH) / 2 + ri * (NH + GAPY) });
    });
  });

  return (
    <div>
      {!hasDeps && (
        <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">
          Diese Maßnahmen sind unabhängig voneinander — du kannst sie in beliebiger Reihenfolge angehen.
        </p>
      )}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: Math.min(W, 820) }} role="img"
          aria-label="Abhängigkeiten zwischen den Maßnahmen">
          <defs>
            <marker id="mv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="fill-zinc-300 dark:fill-zinc-600" />
            </marker>
          </defs>

          {edges.map(({ from, to }) => {
            const a = pos.get(from), b = pos.get(to);
            if (!a || !b) return null;
            const ax = a.x + NW, ay = a.y + NH / 2, bx = b.x, by = b.y + NH / 2;
            const mx = (ax + bx) / 2;
            return (
              <path key={`${from}->${to}`} d={`M${ax},${ay} C${mx},${ay} ${mx},${by} ${bx - 6},${by}`}
                fill="none" strokeWidth="1.6" markerEnd="url(#mv-arrow)"
                className="stroke-zinc-300 dark:stroke-zinc-600" />
            );
          })}

          {measures.map(m => {
            const p = pos.get(m.id); if (!p) return null;
            const c = cat(m);
            const short = m.title.length > 30 ? m.title.slice(0, 28) + "…" : m.title;
            return (
              <g key={m.id} transform={`translate(${p.x},${p.y})`}>
                <title>{m.description || m.title}</title>
                <rect width={NW} height={NH} rx="10" className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" />
                <rect width="4" height={NH} rx="2" fill={c.color} />
                <text x="14" y="21" className="fill-zinc-900 dark:fill-zinc-100 text-[11px] font-bold">{short}</text>
                <text x="14" y="37" className="fill-zinc-400 dark:fill-zinc-500 text-[9.5px]">
                  {c.label} · Wirkung {m.impact ?? "—"} · {m.effort ?? "—"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── D. Radar: category weighting ──────────────────────────────────────────────
function RadarView({ measures }: { measures: RecommendedMeasure[] }) {
  const counts = useMemo(() => {
    const c: Record<MeasureCategory, number> = { tooling: 0, agile: 0, business: 0, security: 0 };
    measures.forEach(m => { c[m.category] = (c[m.category] ?? 0) + 1; });
    return c;
  }, [measures]);

  const max = Math.max(...CAT_KEYS.map(k => counts[k]), 1) + 1;
  const cx = 160, cy = 150, R = 96;
  const ang = (i: number) => (Math.PI * 2 * i) / CAT_KEYS.length - Math.PI / 2;
  const pt = (i: number, f: number) => `${cx + Math.cos(ang(i)) * R * f},${cy + Math.sin(ang(i)) * R * f}`;
  const shape = CAT_KEYS.map((k, i) => pt(i, counts[k] / max)).join(" ");
  const top = [...CAT_KEYS].sort((a, b) => counts[b] - counts[a]);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <svg viewBox="0 0 320 300" className="w-[320px] shrink-0" role="img" aria-label="Verteilung der Maßnahmen je Kategorie">
        {[0.33, 0.66, 1].map(f => (
          <polygon key={f} points={CAT_KEYS.map((_, i) => pt(i, f)).join(" ")}
            fill="none" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" />
        ))}
        {CAT_KEYS.map((_, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(ang(i)) * R} y2={cy + Math.sin(ang(i)) * R}
            className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" />
        ))}
        <polygon points={shape} className="fill-green-500/20 stroke-green-600" strokeWidth="2" strokeLinejoin="round" />
        {CAT_KEYS.map((k, i) => {
          const f = counts[k] / max;
          const lx = cx + Math.cos(ang(i)) * (R + 30), ly = cy + Math.sin(ang(i)) * (R + 30);
          const anchor = Math.cos(ang(i)) > 0.3 ? "start" : Math.cos(ang(i)) < -0.3 ? "end" : "middle";
          return (
            <g key={k}>
              <circle cx={cx + Math.cos(ang(i)) * R * f} cy={cy + Math.sin(ang(i)) * R * f} r="4.5"
                fill={CATS[k].color} className="stroke-white dark:stroke-zinc-900" strokeWidth="2" />
              <text x={lx} y={ly - 1} textAnchor={anchor} className="fill-zinc-700 dark:fill-zinc-300 text-[11px] font-bold">{CATS[k].label}</text>
              <text x={lx} y={ly + 12} textAnchor={anchor} className="fill-zinc-400 dark:fill-zinc-500 text-[9.5px] tabular-nums">
                {counts[k]} {counts[k] === 1 ? "Maßnahme" : "Maßnahmen"}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="w-full sm:w-[240px] space-y-2">
        {top.map(k => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
            <span className="inline-flex items-center gap-2 text-[12.5px] text-zinc-600 dark:text-zinc-300">
              <i className="w-2 h-2 rounded-sm" style={{ background: CATS[k].color }} />
              {CATS[k].label}
            </span>
            <span className="text-[12.5px] font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{counts[k]}</span>
          </div>
        ))}
        <p className="text-[11.5px] leading-relaxed text-zinc-400 dark:text-zinc-500 pt-1">
          Schwerpunkt dieser Transformation: <span className="font-semibold text-zinc-600 dark:text-zinc-300">{CATS[top[0]].label}</span>
          {counts[top[1]] > 0 && <> und <span className="font-semibold text-zinc-600 dark:text-zinc-300">{CATS[top[1]].label}</span></>}.
        </p>
      </div>
    </div>
  );
}

// ── Section shell ─────────────────────────────────────────────────────────────
export function MeasureViews({ measures, lensSummary }: { measures: RecommendedMeasure[]; lensSummary?: string[] }) {
  const [view, setView] = useState<ViewId>("bento");
  if (!measures?.length) return null;
  const active = VIEWS.find(v => v.id === view) ?? VIEWS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0, delay: 0.12 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_8px_-3px_rgba(16,40,22,0.08),0_16px_36px_-20px_rgba(16,40,22,0.16)] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/60 flex items-center justify-center ring-1 ring-green-100 dark:ring-green-900 shrink-0">
          <LayoutGrid className="w-4 h-4 text-green-600" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">Empfohlene Maßnahmen</h2>
          <p className="text-xs text-zinc-400 truncate mt-1">
            {lensSummary?.length ? `Perspektiven: ${lensSummary.join(" · ")}` : "Konkrete Hebel für dieses Projekt"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 px-2.5 py-1 rounded-full tabular-nums">
          {measures.length} Maßnahmen
        </span>
      </div>

      <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1" role="tablist" aria-label="Ansicht wählen">
          {VIEWS.map(v => (
            <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)}
              className={cn("inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-colors duration-150",
                view === v.id
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200")}>
              <v.Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        {view !== "radar" && <CatLegend />}
      </div>

      <p className="px-6 pt-2.5 text-[11.5px] text-zinc-400 dark:text-zinc-500">{active.hint}</p>

      <div className="p-6 pt-4">
        {view === "bento"  && <BentoView measures={measures} />}
        {view === "matrix" && <MatrixView measures={measures} />}
        {view === "flow"   && <FlowView measures={measures} />}
        {view === "radar"  && <RadarView measures={measures} />}
      </div>
    </motion.div>
  );
}
