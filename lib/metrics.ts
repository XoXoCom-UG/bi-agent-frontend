// Parse numbers/metrics out of the free-text the LLM writes into a concept, so
// we can drive real charts from real data (no hand-invented values). Everything
// here is best-effort: if a signal isn't present, the caller simply hides the
// corresponding chart ("wenn die Daten nicht da sind, dann eben nicht").
import type { ConceptData } from "@/lib/api";

// German number formatting: "." = thousands, "," = decimal. "8.640" -> 8640.
export function deNum(raw: string): number | null {
  const cleaned = (raw || "").replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("de-DE");
}

// First numeric value in a fragment; if it's a range ("15.000–25.000") take the midpoint.
function firstQty(side: string): number | null {
  const range = side.match(/(\d[\d.,]*)\s*[–—-]\s*(\d[\d.,]*)/);
  if (range) {
    const a = deNum(range[1]); const b = deNum(range[2]);
    if (a != null && b != null) return (a + b) / 2;
  }
  const one = side.match(/\d[\d.,]*/);
  return one ? deNum(one[0]) : null;
}

type Unit = { base: "pct" | "eur" | "time" | "num"; factor: number; label: string };
function unitOf(side: string): Unit {
  const s = side.toLowerCase();
  if (/%|prozent/.test(s)) return { base: "pct", factor: 1, label: "%" };
  if (/€|eur|euro/.test(s)) return { base: "eur", factor: 1, label: "€" };
  if (/monat/.test(s)) return { base: "time", factor: 160, label: "h" };
  if (/woche/.test(s)) return { base: "time", factor: 40, label: "h" };
  if (/\btag/.test(s)) return { base: "time", factor: 8, label: "h" };
  if (/stunde|std|\bh\b/.test(s)) return { base: "time", factor: 1, label: "h" };
  return { base: "num", factor: 1, label: "" };
}

export type BeforeAfter = { label: string; before: number; after: number; unit: string };

// Extract a "von X auf Y" comparison from a value string, normalising time units
// to hours so before/after share a scale. Returns null if there's no clean pair.
export function beforeAfterOf(label: string, text?: string): BeforeAfter | null {
  if (!text) return null;
  const m = text.match(/von\s+([^.;,()]+?)\s+auf\s+([^.;,()]+)/i);
  if (!m) return null;
  const lv = firstQty(m[1]); const rv = firstQty(m[2]);
  if (lv == null || rv == null) return null;
  const lu = unitOf(m[1]); const ru = unitOf(m[2]);
  if (lu.base !== ru.base || lu.base === "num") return null;
  const before = lv * lu.factor; const after = rv * ru.factor;
  if (before <= 0 && after <= 0) return null;
  return { label, before, after, unit: lu.label };
}

// All €-amounts in a string, each with the surrounding words (context) so callers
// can tell a "setup" figure from a "per month" figure.
type EuroHit = { value: number; ctx: string };
function eurosIn(text?: string): EuroHit[] {
  if (!text) return [];
  const hits: EuroHit[] = [];
  const re = /€\s*(\d[\d.,]*)(?:\s*[–—-]\s*(\d[\d.,]*))?|(\d[\d.,]*)\s*(?:€|eur|euro)/gi;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(text))) {
    let v: number | null;
    if (mm[2]) { const a = deNum(mm[1]); const b = deNum(mm[2]); v = a != null && b != null ? (a + b) / 2 : a; }
    else v = deNum(mm[1] ?? mm[3] ?? "");
    if (v == null || v <= 0) continue;
    const ctx = text.slice(Math.max(0, mm.index - 4), Math.min(text.length, mm.index + mm[0].length + 24)).toLowerCase();
    hits.push({ value: v, ctx });
  }
  return hits;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type EffortMix = { S: number; M: number; L: number };

export type ConceptMetrics = {
  beforeAfter: BeforeAfter[];   // per-KPI Vorher/Nachher (may be empty)
  effort: EffortMix | null;     // count of S/M/L steps, if steps carry effort
  money: { setup: number; monthly: number } | null; // seeds for the ROI simulator
};

export function deriveConceptMetrics(c?: ConceptData | null): ConceptMetrics {
  const bv = c?.business_value_summary ?? {};
  const steps = c?.transformation_steps ?? [];

  // ── Vorher/Nachher per KPI ──────────────────────────────────────────────
  const beforeAfter = [
    beforeAfterOf("Zeitaufwand", bv.manual_effort),
    beforeAfterOf("Fehlerrate", bv.error_rate),
    beforeAfterOf("Kosten", bv.cost_savings),
  ].filter((x): x is BeforeAfter => x != null);

  // ── Aufwandsverteilung (S/M/L) ──────────────────────────────────────────
  let effort: EffortMix | null = null;
  const mix: EffortMix = { S: 0, M: 0, L: 0 };
  let any = false;
  for (const s of steps) {
    const e = (s.effort || "").trim().toUpperCase();
    if (e === "S" || e.startsWith("S")) { mix.S++; any = true; }
    else if (e === "L" || e.startsWith("L") || e.startsWith("XL")) { mix.L++; any = true; }
    else if (e === "M" || e.startsWith("M")) { mix.M++; any = true; }
  }
  if (any) effort = mix;

  // ── Money seeds for the ROI simulator ───────────────────────────────────
  const text: string[] = [];
  Object.values(bv).forEach(v => v && text.push(v));
  steps.forEach(s => { if (s.business_value) text.push(s.business_value); if (s.description) text.push(s.description); });
  const hits = text.flatMap(eurosIn);

  let money: ConceptMetrics["money"] = null;
  if (hits.length) {
    // Prefer an explicitly monthly figure, else annualised /12, else weekly ×4.33.
    let monthly = 0;
    const perMonth = hits.find(h => /monat/.test(h.ctx));
    const perYear = hits.find(h => /jahr|jährl|p\.a\./.test(h.ctx));
    const perWeek = hits.find(h => /woche/.test(h.ctx));
    if (perMonth) monthly = perMonth.value;
    else if (perYear) monthly = perYear.value / 12;
    else if (perWeek) monthly = perWeek.value * 4.33;

    const setup = hits.find(h => /setup|einmal|initial|aufbau|einricht/.test(h.ctx))?.value ?? 0;

    // Reasonable fallbacks so the simulator is always usable once any € exists.
    const median = [...hits.map(h => h.value)].sort((a, b) => a - b)[Math.floor(hits.length / 2)];
    const monthlySeed = clamp(Math.round((monthly || median * 0.5) / 10) * 10, 500, 40000);
    const setupSeed = clamp(Math.round((setup || monthlySeed * 1.5) / 100) * 100, 0, 80000);
    money = { setup: setupSeed, monthly: monthlySeed };
  }

  return { beforeAfter, effort, money };
}
