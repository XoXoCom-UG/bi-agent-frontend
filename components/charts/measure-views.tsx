"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { RecommendedMeasure, MeasureCategory } from "@/lib/api";
import { Crosshair, GitBranch, ArrowRight, Wrench, Users, TrendingUp, ShieldCheck } from "lucide-react";

/*
 * Empfohlene Maßnahmen.
 *
 * This replaced a single card with four tabbed views (bento / scatter / graph /
 * radar). Two problems drove the rewrite:
 *
 *  1. The scatter plot was undecodable. Measures were numbered dots with the
 *     names in a separate list, so reading it meant mapping 10 numbers by eye —
 *     and dots landed on top of each other, since impact × effort only has 12
 *     distinct positions for 10 measures. A chart you have to decode is worse
 *     than a list. Every measure now sits in its quadrant AS ITS NAME, which
 *     makes overlap impossible and the legend unnecessary.
 *  2. Four views of the same ten measures, stacked in one container, read as
 *     clutter. Now: two sections that answer two different questions —
 *     "what first?" and "in what order?" — and nothing that merely restates them.
 *
 * Colour always means category.
 */

const CATS: Record<MeasureCategory, { label: string; color: string; Icon: React.ElementType }> = {
  tooling:  { label: "Tooling",  color: "var(--cat-tooling)",  Icon: Wrench },
  agile:    { label: "Agile",    color: "var(--cat-agile)",    Icon: Users },
  business: { label: "Business", color: "var(--cat-business)", Icon: TrendingUp },
  security: { label: "Security", color: "var(--cat-security)", Icon: ShieldCheck },
};
const CAT_KEYS = Object.keys(CATS) as MeasureCategory[];

const IMPACT_ORDER = { Low: 0, Medium: 1, High: 2 } as const;
const EFFORT_ORDER = { S: 0, M: 1, L: 2, XL: 3 } as const;

const cat = (m: RecommendedMeasure) => CATS[m.category] ?? CATS.tooling;
const impactIdx = (m: RecommendedMeasure) => IMPACT_ORDER[m.impact ?? "Medium"] ?? 1;
const effortIdx = (m: RecommendedMeasure) => EFFORT_ORDER[m.effort ?? "M"] ?? 1;

/**
 * Collapse near-duplicate consultant lenses.
 *
 * The generator reaches for several names for one lens — a real run produced
 * "Compliance & Datenschutz", "Datenschutz & Compliance" AND "DSGVO Compliance",
 * so the line ran to eight entries and got truncated mid-word. The backend now
 * dedupes too, but concepts saved before that fix still carry the long list, and
 * they must render clean without being regenerated.
 */
function tidyLenses(lenses: string[]): string[] {
  const best = new Map<string, string>();
  for (const raw of lenses) {
    const lens = raw.trim();
    if (!lens) continue;
    const key = (lens.toLowerCase().match(/\w+/g) ?? [])
      .filter(w => w !== "und" && w !== "and")
      .sort()
      .join(" ");
    if (!key) continue;
    const prev = best.get(key);
    if (!prev || lens.length > prev.length) best.set(key, lens);
  }
  return [...best.values()].sort().slice(0, 5);
}

// ── section shell ─────────────────────────────────────────────────────────────

function Section({
  title, hint, Icon, right, children,
}: {
  title: string; hint: string; Icon: React.ElementType;
  right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_8px_-3px_rgba(16,40,22,0.08),0_16px_36px_-20px_rgba(16,40,22,0.16)] overflow-hidden"
    >
      <div className="px-6 pt-5 pb-4 flex items-start gap-3 flex-wrap">
        <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/60 flex items-center justify-center ring-1 ring-green-100 dark:ring-green-900 shrink-0">
          <Icon className="w-4 h-4 text-green-600" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">{title}</h2>
          <p className="text-xs text-zinc-400 mt-1.5">{hint}</p>
        </div>
        {right}
      </div>
      <div className="px-6 pb-6">{children}</div>
    </motion.section>
  );
}

/** Category mix as one thin proportional bar. Replaces a radar chart whose axis
 *  labels were clipped and which said nothing four numbers can't. */
function CategoryStrip({ measures }: { measures: RecommendedMeasure[] }) {
  const counts = CAT_KEYS.map(k => ({ k, n: measures.filter(m => m.category === k).length }))
    .filter(c => c.n > 0);
  const total = counts.reduce((a, c) => a + c.n, 0) || 1;
  return (
    <div className="min-w-[160px]">
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        {counts.map(({ k, n }) => (
          <motion.i
            key={k}
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: n }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            style={{ background: CATS[k].color, flexBasis: 0 }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {counts.map(({ k, n }) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[10.5px] text-zinc-500 dark:text-zinc-400">
            <i className="w-1.5 h-1.5 rounded-full" style={{ background: CATS[k].color }} />
            {CATS[k].label}
            <b className="font-bold text-zinc-700 dark:text-zinc-200 tabular-nums">{n}</b>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="tabular-nums">{Math.round((n / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function EffortTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9.5px] font-bold tabular-nums text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-px shrink-0">
      {children}
    </span>
  );
}

/**
 * One measure, named. The whole point of the rewrite: the reader sees the title,
 * never a number to look up.
 */
function MeasureChip({
  m, selected, onSelect,
}: { m: RecommendedMeasure; selected: boolean; onSelect: () => void }) {
  const c = cat(m);
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.985 }}
      aria-pressed={selected}
      className={cn(
        "group w-full text-left flex items-start gap-2 rounded-lg pl-2.5 pr-2 py-2 transition-colors duration-150",
        "border bg-white dark:bg-zinc-900",
        selected
          ? "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/60"
          : "border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      )}
    >
      <i className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]" style={{ background: c.color }} />
      <span className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug text-zinc-800 dark:text-zinc-200">
        {m.title}
      </span>
      {m.effort ? <EffortTag>{m.effort}</EffortTag> : null}
    </motion.button>
  );
}

/** Detail for the selected measure — the "dynamic" part: one click, full context,
 *  without a tooltip that vanishes or a wall of text that never collapses. */
function MeasureDetail({ m, all }: { m: RecommendedMeasure; all: RecommendedMeasure[] }) {
  const c = cat(m);
  const deps = (m.depends_on ?? [])
    .map(id => all.find(x => x.id === id)?.title)
    .filter(Boolean) as string[];
  return (
    <motion.div
      key={m.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 p-4">
        <div className="flex items-start gap-2.5">
          <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: c.color }} />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug">{m.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10.5px] text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />{c.label}
              </span>
              <span>Wirkung <b className="font-bold text-zinc-700 dark:text-zinc-200">{m.impact ?? "—"}</b></span>
              <span>Aufwand <b className="font-bold text-zinc-700 dark:text-zinc-200">{m.effort ?? "—"}</b></span>
              {m.lens ? <span className="text-zinc-400">{m.lens}</span> : null}
            </div>
            {m.description ? (
              <p className="text-[12px] text-zinc-600 dark:text-zinc-300 leading-relaxed mt-2.5">{m.description}</p>
            ) : null}
            {deps.length ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2.5">
                Setzt voraus: <span className="text-zinc-700 dark:text-zinc-200">{deps.join(" · ")}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 1. Priorisierung — named measures in their quadrant ───────────────────────

type QuadId = "quick" | "bets" | "side" | "later";

// Impact has three levels but a 2×2 has two rows, so the bottom row holds
// everything below High. It must NOT be labelled "wenig Wirkung": the generator is
// required to produce a spread, so Medium is the middle of the range, not the
// bottom — calling "Secrets Manager" low-impact would be plainly wrong. Hence
// "moderate", and the exact value is one click away in the detail panel.
const QUADS: { id: QuadId; label: string; hint: string; lead?: boolean }[] = [
  { id: "quick", label: "Quick Wins",        hint: "hohe Wirkung · wenig Aufwand", lead: true },
  { id: "bets",  label: "Große Wetten",      hint: "hohe Wirkung · hoher Aufwand" },
  { id: "side",  label: "Einfach mitnehmen", hint: "moderate Wirkung · wenig Aufwand" },
  { id: "later", label: "Später prüfen",     hint: "moderate Wirkung · hoher Aufwand" },
];

const quadOf = (m: RecommendedMeasure): QuadId => {
  const high = impactIdx(m) >= 2;       // High
  const cheap = effortIdx(m) <= 1;      // S or M
  return high ? (cheap ? "quick" : "bets") : cheap ? "side" : "later";
};

export function MeasurePriorityBoard({
  measures, lensSummary,
}: { measures: RecommendedMeasure[]; lensSummary?: string[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const byQuad = useMemo(() => {
    const g: Record<QuadId, RecommendedMeasure[]> = { quick: [], bets: [], side: [], later: [] };
    // Highest impact first inside a quadrant, so the top of each list matters most.
    [...measures]
      .sort((a, b) => impactIdx(b) - impactIdx(a) || effortIdx(a) - effortIdx(b))
      .forEach(m => g[quadOf(m)].push(m));
    return g;
  }, [measures]);

  const lenses = useMemo(() => tidyLenses(lensSummary ?? []), [lensSummary]);

  if (!measures.length) return null;
  const selected = measures.find(m => m.id === sel) ?? null;

  return (
    <Section
      title="Empfohlene Maßnahmen"
      hint={`${measures.length} Maßnahmen · nach Wirkung und Aufwand einsortiert — tippe eine an für Details`}
      Icon={Crosshair}
      right={<CategoryStrip measures={measures} />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {QUADS.map(q => {
          const list = byQuad[q.id];
          return (
            <div
              key={q.id}
              className={cn(
                "rounded-xl border p-3.5 min-h-[128px]",
                q.lead
                  ? "border-green-200/80 dark:border-green-900/60 bg-green-50/40 dark:bg-green-950/20"
                  : "border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20"
              )}
            >
              <div className="flex items-baseline justify-between gap-2 mb-2.5">
                <div className="min-w-0">
                  <p className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    q.lead ? "text-green-700 dark:text-green-400" : "text-zinc-500 dark:text-zinc-400"
                  )}>
                    {q.label}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{q.hint}</p>
                </div>
                <span className="text-[11px] font-bold tabular-nums text-zinc-400 shrink-0">{list.length}</span>
              </div>

              {list.length ? (
                <div className="flex flex-col gap-1.5">
                  {list.map(m => (
                    <MeasureChip
                      key={m.id}
                      m={m}
                      selected={sel === m.id}
                      onSelect={() => setSel(sel === m.id ? null : m.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-300 dark:text-zinc-600">—</p>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selected && <MeasureDetail m={selected} all={measures} />}
      </AnimatePresence>

      {lenses.length ? (
        <p className="text-[11px] text-zinc-400 mt-4 leading-relaxed">
          Perspektiven: <span className="text-zinc-500 dark:text-zinc-400">{lenses.join(" · ")}</span>
        </p>
      ) : null}
    </Section>
  );
}

// ── 2. Reihenfolge — dependency stages ────────────────────────────────────────

/**
 * Order as stages, not as a node graph.
 *
 * The SVG graph this replaced had to truncate every title to ~28 characters to
 * fit a fixed node box ("Managed Services statt selbs…"), and it scrolled
 * sideways on a laptop. Stages carry full titles, reflow on any width, and answer
 * the same question: what can start now, and what has to wait.
 */
export function MeasureSequence({ measures }: { measures: RecommendedMeasure[] }) {
  const stages = useMemo(() => {
    const byId = new Map(measures.map(m => [m.id, m]));
    const depth = new Map<string, number>();
    const resolve = (id: string, seen: Set<string>): number => {
      if (depth.has(id)) return depth.get(id)!;
      if (seen.has(id)) return 0;                       // cycle guard
      seen.add(id);
      const deps = (byId.get(id)?.depends_on ?? []).filter(d => byId.has(d) && d !== id);
      const v = deps.length ? Math.max(...deps.map(d => resolve(d, seen))) + 1 : 0;
      depth.set(id, v);
      return v;
    };
    measures.forEach(m => resolve(m.id, new Set()));
    const max = Math.max(0, ...depth.values());
    const out: RecommendedMeasure[][] = Array.from({ length: max + 1 }, () => []);
    measures.forEach(m => out[depth.get(m.id) ?? 0].push(m));
    return out;
  }, [measures]);

  if (!measures.length) return null;

  // Everything independent ⇒ there is no order to show, so don't show an empty one.
  if (stages.length < 2) {
    return (
      <Section title="Reihenfolge" hint="Was baut auf was auf" Icon={GitBranch}>
        <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
          Diese Maßnahmen sind unabhängig voneinander — die Reihenfolge kannst du frei nach
          Priorisierung wählen.
        </p>
      </Section>
    );
  }

  const NAMES = ["Zuerst möglich", "Danach", "Anschließend", "Zuletzt"];

  return (
    <Section
      title="Reihenfolge"
      hint={`${stages.length} Stufen · was zuerst möglich ist und was darauf aufbaut`}
      Icon={GitBranch}
    >
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2.5">
        {stages.map((stage, si) => (
          <div key={si} className="flex flex-col lg:flex-row lg:items-stretch gap-2.5 flex-1 min-w-0">
            <div className="flex-1 min-w-0 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20 p-3.5">
              <div className="flex items-baseline justify-between gap-2 mb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {NAMES[si] ?? `Stufe ${si + 1}`}
                </p>
                <span className="text-[11px] font-bold tabular-nums text-zinc-400 shrink-0">{stage.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {stage.map(m => {
                  const c = cat(m);
                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-2.5 pr-2 py-2 flex items-start gap-2"
                    >
                      <i className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]" style={{ background: c.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-medium leading-snug text-zinc-800 dark:text-zinc-200">
                          {m.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {c.label} · Wirkung {m.impact ?? "—"}
                        </p>
                      </div>
                      {m.effort ? <EffortTag>{m.effort}</EffortTag> : null}
                    </div>
                  );
                })}
              </div>
            </div>
            {si < stages.length - 1 && (
              <div className="flex lg:flex-col items-center justify-center shrink-0 text-zinc-300 dark:text-zinc-600">
                <ArrowRight className="w-4 h-4 rotate-90 lg:rotate-0" strokeWidth={1.8} />
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
