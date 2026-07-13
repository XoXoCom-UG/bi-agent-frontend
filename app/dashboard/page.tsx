"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, RoadmapData } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { AssistantContext } from "@/lib/chat-store";
import { DEMO_ROADMAP } from "@/lib/demo";
import {
  MessageSquare, Zap, Map, ArrowLeft,
  CheckCircle2, ChevronDown, Copy, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ── Roadmap loading ───────────────────────────────────────────────────────────
const RM_PHASES = [
  { text: "Lese und verstehe deine Konversation...", ms: 0 },
  { text: "Identifiziere Transformationsphasen...", ms: 3500 },
  { text: "Plane konkrete Maßnahmen...", ms: 7000 },
  { text: "Wähle die besten Tools aus...", ms: 10500 },
  { text: "Berechne Aufwände und Prioritäten...", ms: 14000 },
  { text: "Erstelle die finale Roadmap...", ms: 17000 },
];

function RoadmapLoading() {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => {
    const timers = RM_PHASES.map((m, i) =>
      setTimeout(() => { setCurrent(i); if (i > 0) setDone(prev => [...prev, i - 1]); }, m.ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 px-8">
      <motion.div
        className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-600/20 mb-12"
        animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}>
        <Map className="w-6 h-6" strokeWidth={1.5} />
      </motion.div>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {RM_PHASES.map((m, i) => {
          if (i > current) return null;
          const isDone = done.includes(i);
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
              className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-green-500" strokeWidth={2} />
                  : <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="w-2.5 h-2.5 rounded-full bg-green-500 block" />}
              </div>
              <p className={`text-sm leading-snug ${isDone ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200 font-medium"}`}>
                {m.text}
              </p>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-zinc-400 mt-10">Das dauert typischerweise 15–30 Sekunden</p>
    </motion.div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ step, index, onDiscuss }: {
  step: NonNullable<RoadmapData["phases"]>[0]["steps"][0];
  index: number;
  onDiscuss?: (ctx: AssistantContext) => void;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText([step.title, step.what, step.why].filter(Boolean).join("\n\n"))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  function verdictStyle(v: string) {
    const l = v?.toLowerCase() ?? "";
    if (l.includes("empf")) return "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
    if (l.includes("vorsicht") || l.includes("nicht")) return "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    return "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0.05, delay: index * 0.06 }}
      className={`rounded-xl border overflow-hidden transition-colors duration-150 ${
        done
          ? "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Checkbox */}
        <button
          onClick={() => setDone(d => !d)}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
            done ? "bg-green-500 border-green-500" : "border-zinc-300 dark:border-zinc-600 hover:border-green-400"
          }`}
        >
          <AnimatePresence>
            {done && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                transition={{ type: "spring", duration: 0.18, bounce: 0.4 }}>
                <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Title — clicking expands */}
        <button className="flex-1 text-left" onClick={() => setOpen(o => !o)}>
          <span className={`text-sm font-medium leading-snug ${
            done ? "line-through text-zinc-400 dark:text-zinc-600" : "text-zinc-900 dark:text-zinc-50"
          }`}>{step.title}</span>
        </button>

        {/* Effort + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {step.effort && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono tabular-nums">{step.effort}</span>
          )}
          <button onClick={() => setOpen(o => !o)} className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: "spring", duration: 0.28, bounce: 0.1 }}
              className="block"
            >
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
            </motion.span>
          </button>
        </div>
      </div>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.32, bounce: 0.05 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {step.what && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-2">{step.what}</p>
              )}
              {step.why && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                  <span className="font-semibold text-green-600">Warum: </span>{step.why}
                </p>
              )}
              {step.tools && step.tools.length > 0 && (
                <div className="flex flex-col gap-2 mt-3">
                  {step.tools.map((tool, ti) => (
                    <motion.div key={tool.name}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ti * 0.04 }}
                      className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-1">{tool.name}</span>
                        {tool.verdict && (
                          <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${verdictStyle(tool.verdict)}`}>
                            {tool.verdict}
                          </span>
                        )}
                      </div>
                      {tool.why && <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2">{tool.why}</p>}
                      {(tool.pros?.length || tool.cons?.length) && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {tool.pros?.length ? (
                            <div>
                              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-1.5">Dafür</p>
                              {tool.pros.map((p, i) => <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">· {p}</p>)}
                            </div>
                          ) : null}
                          {tool.cons?.length ? (
                            <div>
                              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-1.5">Dagegen</p>
                              {tool.cons.map((c, i) => <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">· {c}</p>)}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
              {/* Footer: discuss (left) + copy (right) */}
              <div className="flex items-center justify-between mt-3">
                {onDiscuss ? (
                  <button
                    onClick={() => onDiscuss({
                      quote: [step.title, step.what, (step.tools ?? []).map(t => t.name).join(", ")].filter(Boolean).join(" — "),
                      question: "Welche Vor- und Nachteile hat dieser Vorschlag für mich, und welche Alternativen gibt es?",
                    })}
                    className="flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Mit Agent diskutieren
                  </button>
                ) : <span />}
                <button onClick={copy}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  <motion.span key={copied ? "c" : "n"} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.2 }}>
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={2} />
                      : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  </motion.span>
                  {copied ? "Kopiert" : "Kopieren"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
function DashboardContent() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const params = useSearchParams();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [rmSession, setRmSession] = useState<string | null>(null);
  const [rmLoading, setRmLoading] = useState(false);
  // Floating "discuss selection" button — feeds the shared assistant panel
  const [selBtn, setSelBtn] = useState<{ x: number; y: number; text: string } | null>(null);
  const rmBodyRef = useRef<HTMLDivElement>(null);

  function handleRmMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length < 9 || !sel || sel.rangeCount === 0) { setSelBtn(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const el = rmBodyRef.current;
    if (!el) return;
    const host = el.getBoundingClientRect();
    setSelBtn({
      x: Math.min(rect.left - host.left + rect.width / 2, host.width - 130),
      y: rect.top - host.top + el.scrollTop - 38,
      text: text.slice(0, 600),
    });
  }

  function askAboutSelection() {
    if (!selBtn) return;
    store.pushAssistant({ quote: selBtn.text });
    setSelBtn(null);
    window.getSelection()?.removeAllRanges();
  }

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  // Open the roadmap for the current conversation directly (no more Deck).
  useEffect(() => {
    if (!token || store.demoActive) return;
    const s = params.get("session") || store.sessionId;
    if (s) openRoadmap(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, token]);

  async function openRoadmap(sid: string) {
    setRmSession(sid); setRmLoading(true); setRoadmap(null);
    try { const d = await api.generateRoadmap(token!, sid); setRoadmap(d.roadmap); } catch {} finally { setRmLoading(false); }
  }

  // During the tour, open the bundled example roadmap immediately.
  useEffect(() => {
    if (store.demoActive) { setRoadmap(DEMO_ROADMAP); setRmLoading(false); }
  }, [store.demoActive]);

  // Feed the right-side assistant with the roadmap currently on screen.
  useEffect(() => {
    if (!roadmap) { store.setLeftContext("Der Nutzer ist im Dashboard (Deck-Übersicht)."); return; }
    const parts: string[] = [roadmap.title ? `Roadmap: ${roadmap.title}` : "Roadmap"];
    roadmap.phases?.forEach((ph, i) => {
      parts.push(`Phase ${i + 1}: ${ph.name}${ph.goal ? " — " + ph.goal : ""}`);
      ph.steps.forEach(s => parts.push(`  • ${s.title}${s.tools?.length ? " (Tools: " + s.tools.map(t => t.name).join(", ") + ")" : ""}`));
    });
    store.setLeftContext(`Roadmap, die der Nutzer gerade ansieht:\n${parts.join("\n")}`.slice(0, 2500));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap]);

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
      <div className="thinking-spinner" style={{ width: 24, height: 24 }} />
    </div>
  );

  return (
    <AppShell active="dashboard">
      <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">

        {/* Empty state when there is no roadmap yet */}
        {!roadmap && !rmLoading && (
          <div className="flex-1 overflow-y-auto p-5 md:p-6 flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-10 py-16 text-center max-w-md">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Map className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Noch keine Roadmap</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Erstelle zuerst ein Transformation Concept aus eurem Gespräch — daraus entsteht die Roadmap.</p>
              <motion.button whileTap={{ scale: 0.96 }}
                onClick={() => router.push(`/concept?session=${store.sessionId}`)}
                className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 rounded-lg px-5 py-2.5 inline-flex items-center gap-2">
                <Zap className="w-4 h-4" strokeWidth={1.5} />Zum Konzept
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* Roadmap panel */}
        <AnimatePresence>
          {(roadmap || rmLoading) && (
            <motion.div key="roadmap"
              initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.08 }}
              className="absolute inset-0 bg-white dark:bg-zinc-900 z-20 flex flex-col overflow-hidden">

              {/* Roadmap topbar */}
              <div className="h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center px-5 gap-3 flex-shrink-0">
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => router.push("/chat")}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />Chat
                </motion.button>
                <h2 className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {roadmap?.title || "Roadmap"}
                </h2>
              </div>

              {/* Roadmap body */}
              <div className="flex-1 flex min-h-0">
                <div ref={rmBodyRef} onMouseUp={handleRmMouseUp} className="flex-1 overflow-y-auto relative">

                  {/* Floating button on text selection */}
                  <AnimatePresence>
                    {selBtn && (
                      <motion.button
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.94 }}
                        transition={{ type: "spring", duration: 0.25, bounce: 0.2 }}
                        onClick={askAboutSelection}
                        style={{ left: selBtn.x, top: Math.max(selBtn.y, 8) }}
                        className="absolute z-30 flex items-center gap-1.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-full px-3.5 py-2 shadow-lg -translate-x-1/2"
                      >
                        <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Mit Agent diskutieren
                      </motion.button>
                    )}
                  </AnimatePresence>
                  {rmLoading && <RoadmapLoading />}

                  {roadmap && !rmLoading && (
                    <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-10">

                      {/* Overview header — what this roadmap is about */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                        className="pb-6 border-b border-zinc-100 dark:border-zinc-800 -mb-2">
                        <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-green-600 mb-2 flex items-center gap-2">
                          Roadmap
                          {store.demoActive && (
                            <span className="text-[10px] font-semibold tracking-wide text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded px-1.5 py-0.5 normal-case">Beispiel</span>
                          )}
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2 leading-tight">
                          {roadmap.title || "Deine Roadmap"}
                        </h2>
                        {roadmap.overview && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
                            {roadmap.overview}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                          {roadmap.phases?.length ?? 0} Phasen · {roadmap.phases?.reduce((n, ph) => n + ph.steps.length, 0) ?? 0} Maßnahmen
                          — hake ab, was erledigt ist, und diskutiere Tools & Alternativen direkt mit dem Agenten.
                        </p>
                      </motion.div>

                      {roadmap.phases?.map((ph, pi) => (
                        <motion.div key={pi}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", duration: 0.4, bounce: 0, delay: pi * 0.07 }}>

                          {/* Phase header */}
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="text-[11px] font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full px-2.5 py-0.5 tracking-wide">
                              Phase {pi + 1}
                            </span>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{ph.name}</h3>
                          </div>
                          {ph.goal && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">{ph.goal}</p>
                          )}

                          {/* Steps — clean list */}
                          <div className="flex flex-col gap-2">
                            {ph.steps.map((step, si) => (
                              <StepCard key={step.id} step={step} index={si}
                                onDiscuss={ctx => store.pushAssistant(ctx)} />
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="thinking-spinner" style={{ width: 24, height: 24 }} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
