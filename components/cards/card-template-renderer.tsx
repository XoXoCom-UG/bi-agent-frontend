"use client";
import { motion } from "motion/react";
import { LayoutGrid } from "lucide-react";
import type { ConceptCard } from "@/lib/api";
import {
  KpiCard, BeforeAfterBar, RadialGauge, ProgressCard, RiskBadgeList, StatusList,
  TimelineSteps, DonutBreakdown, ScorecardGrid, ComparisonTable, ChecklistProgress,
  StatGrid, GenericFallbackCard,
} from "./card-components";

/*
 * Renders whatever cards the backend picked for this concept.
 *
 * The backend sends {template_id, component, data}. Only `component` is used to
 * resolve the renderer, which is what lets the template catalogue grow from 46 to
 * hundreds of entries without any change here: a new template only needs to reuse
 * a component that already exists in COMPONENT_MAP.
 *
 * An unknown component renders GenericFallbackCard instead of crashing — a stale
 * frontend paired with a newer catalogue degrades, it doesn't break the page.
 */

const COMPONENT_MAP: Record<string, React.ComponentType<Record<string, unknown>>> = {
  KpiCard, BeforeAfterBar, RadialGauge, ProgressCard, RiskBadgeList, StatusList,
  TimelineSteps, DonutBreakdown, ScorecardGrid, ComparisonTable, ChecklistProgress,
  StatGrid,
};

export function CardTemplateRenderer({ card }: { card: ConceptCard }) {
  const Component = COMPONENT_MAP[card.component] ?? GenericFallbackCard;
  return <Component {...(card.data ?? {})} />;
}

export function ConceptCardsSection({ cards }: { cards: ConceptCard[] }) {
  if (!cards?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_8px_-3px_rgba(16,40,22,0.08),0_16px_36px_-20px_rgba(16,40,22,0.16)] overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/60 flex items-center justify-center ring-1 ring-green-100 dark:ring-green-900 shrink-0">
          <LayoutGrid className="w-4 h-4 text-green-600" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
            Kennzahlen &amp; Auswertung
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Passend zu diesem Vorhaben ausgewählt</p>
        </div>
      </div>

      {/* 10 cards need to wrap; a fixed 3-up row would overflow. Wide cards
          (tables, stat grids) opt into 2 columns themselves via sm:col-span-2. */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {cards.map((card, i) => (
          <motion.div
            key={`${card.template_id}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className={card.component === "ComparisonTable" || card.component === "StatGrid" ? "sm:col-span-2" : ""}
          >
            <CardTemplateRenderer card={card} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
