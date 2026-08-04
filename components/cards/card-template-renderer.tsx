"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, Info, EyeOff, Pin, PinOff, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConceptCard } from "@/lib/api";
import {
  KpiCard, BeforeAfterBar, RadialGauge, ProgressCard, RiskBadgeList, StatusList,
  TimelineSteps, DonutBreakdown, ScorecardGrid, ComparisonTable, ChecklistProgress,
  StatGrid, GenericFallbackCard,
} from "./card-components";

/*
 * Renders whatever cards the backend picked for this concept.
 *
 * The backend sends {template_id, component, title, topic, data}. Only `component`
 * resolves the renderer, which is what lets the catalogue grow without changes
 * here: a new template only needs to reuse a component already in COMPONENT_MAP.
 * An unknown component renders GenericFallbackCard instead of crashing, so a stale
 * frontend paired with a newer catalogue degrades rather than breaks.
 *
 * The frame around each card lives here, not in the components: hiding, pinning and
 * the "where does this number come from" panel are the same for all twelve.
 */

const COMPONENT_MAP: Record<string, React.ComponentType<Record<string, unknown>>> = {
  KpiCard, BeforeAfterBar, RadialGauge, ProgressCard, RiskBadgeList, StatusList,
  TimelineSteps, DonutBreakdown, ScorecardGrid, ComparisonTable, ChecklistProgress,
  StatGrid,
};

/** Components that need the full width to be readable. */
const WIDE = new Set(["ComparisonTable", "StatGrid"]);

export function CardTemplateRenderer({
  card, checked, onToggle,
}: {
  card: ConceptCard;
  /** Milestone labels ticked off in this card (ProgressCard). */
  checked?: string[];
  onToggle?: (itemLabel: string) => void;
}) {
  const Component = COMPONENT_MAP[card.component] ?? GenericFallbackCard;
  // `title` is passed alongside the data so each template names its own card; the
  // tick state only matters to the components that have milestones.
  return (
    <Component
      {...(card.data ?? {})}
      title={card.title ?? card.data?.label}
      checked={checked}
      onToggle={onToggle}
    />
  );
}

function IconButton({
  label, onClick, children, active,
}: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150",
        "border backdrop-blur-sm",
        active
          ? "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400"
          : "border-zinc-200 dark:border-zinc-700 bg-white/85 dark:bg-zinc-900/85 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

/**
 * One card plus its controls.
 *
 * `basis` is the sentence the backend writes explaining where the figure came from
 * — which statement in the concept, and the arithmetic if any. It opens as an
 * overlay rather than always-on text: the number is the point, the derivation is
 * what you reach for when you have to defend it.
 */
function CardFrame({
  card, pinned, onHide, onTogglePin, checked, onToggleItem,
}: {
  card: ConceptCard; pinned: boolean;
  onHide: () => void; onTogglePin: () => void;
  checked?: string[]; onToggleItem?: (itemLabel: string) => void;
}) {
  const [showBasis, setShowBasis] = useState(false);
  const basis = typeof card.data?.basis === "string" ? card.data.basis : "";

  // Column span is set by the grid child in ConceptCardsSection — this frame sits
  // one level deeper, so a col-span here would do nothing.
  return (
    <div className="relative group h-full">
      <CardTemplateRenderer card={card} checked={checked} onToggle={onToggleItem} />

      {/* Controls stay out of the way until the card is hovered or focused. */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 no-print">
        {basis ? (
          <IconButton label="Woher kommt diese Zahl?" onClick={() => setShowBasis(v => !v)} active={showBasis}>
            <Info className="w-3.5 h-3.5" strokeWidth={1.8} />
          </IconButton>
        ) : null}
        <IconButton label={pinned ? "Nicht mehr anpinnen" : "Nach oben anpinnen"} onClick={onTogglePin} active={pinned}>
          {pinned ? <PinOff className="w-3.5 h-3.5" strokeWidth={1.8} /> : <Pin className="w-3.5 h-3.5" strokeWidth={1.8} />}
        </IconButton>
        <IconButton label="Karte ausblenden" onClick={onHide}>
          <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />
        </IconButton>
      </div>

      <AnimatePresence>
        {showBasis && basis && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-x-0 bottom-0 rounded-b-xl border-t border-zinc-200/80 dark:border-zinc-700 bg-white/97 dark:bg-zinc-900/97 backdrop-blur-sm p-3.5 no-print"
          >
            <div className="flex items-start gap-2">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400 shrink-0 mt-px">
                Rechenweg
              </span>
              <p className="text-[11.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed min-w-0 flex-1">{basis}</p>
              <button
                type="button"
                onClick={() => setShowBasis(false)}
                aria-label="Schließen"
                className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ConceptCardsSection({
  cards, hidden = [], pinned = null, checked = {}, onHiddenChange, onPinnedChange, onCheckedChange,
}: {
  cards: ConceptCard[];
  hidden?: string[];
  pinned?: string | null;
  /** template_id -> ticked milestone labels. */
  checked?: Record<string, string[]>;
  onHiddenChange?: (next: string[]) => void;
  onPinnedChange?: (next: string | null) => void;
  onCheckedChange?: (next: Record<string, string[]>) => void;
}) {
  if (!cards?.length) return null;

  const visible = cards.filter(c => !hidden.includes(c.template_id));
  // Pinned wins; otherwise the backend's order already puts Ist→Ziel first.
  const byPriority = pinned
    ? [...visible].sort((a, b) => (a.template_id === pinned ? -1 : b.template_id === pinned ? 1 : 0))
    : visible;

  // Lead card, then the narrow cards paired up, then the full-width ones.
  //
  // A wide card in the middle of the run broke a pair and left the card beside it
  // orphaned next to a gap — the same ragged look as before, just smaller. Wide
  // cards are the reference tables, so they read fine at the end, and this leaves
  // at most one half-empty row: the last.
  const [lead, ...rest] = byPriority;
  const ordered = lead
    ? [lead, ...rest.filter(c => !WIDE.has(c.component)), ...rest.filter(c => WIDE.has(c.component))]
    : [];

  const hide = (id: string) => onHiddenChange?.([...hidden, id]);
  const restore = () => onHiddenChange?.([]);
  const togglePin = (id: string) => onPinnedChange?.(pinned === id ? null : id);
  const toggleItem = (tid: string, itemLabel: string) => {
    const cur = checked[tid] ?? [];
    const next = cur.includes(itemLabel) ? cur.filter(l => l !== itemLabel) : [...cur, itemLabel];
    onCheckedChange?.({ ...checked, [tid]: next });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_8px_-3px_rgba(16,40,22,0.08),0_16px_36px_-20px_rgba(16,40,22,0.16)] overflow-hidden"
    >
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/60 flex items-center justify-center ring-1 ring-green-100 dark:ring-green-900 shrink-0">
          <LayoutGrid className="w-4 h-4 text-green-600" strokeWidth={1.6} />
        </div>
        <h2 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none min-w-0 flex-1">
          Auf einen Blick
        </h2>
        {hidden.length > 0 && (
          <button
            type="button"
            onClick={restore}
            className="no-print inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.6} />
            {hidden.length} wieder einblenden
          </button>
        )}
      </div>

      {/* Equal-height rows: cards fill their cell (CardShell is h-full), so a row
          ends flush instead of leaving a void under the shorter card. */}
      <div className="px-5 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ordered.map((card, i) => (
          <motion.div
            key={`${card.template_id}-${i}`}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.24), duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className={cn("min-w-0", (i === 0 || WIDE.has(card.component)) && "sm:col-span-2")}
          >
            <CardFrame
              card={card}
              pinned={pinned === card.template_id}
              onHide={() => hide(card.template_id)}
              onTogglePin={() => togglePin(card.template_id)}
              checked={checked[card.template_id] ?? []}
              onToggleItem={label => toggleItem(card.template_id, label)}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
