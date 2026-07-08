"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, ConceptData } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { dateStr } from "@/lib/utils";
import {
  Clock, AlertTriangle, TrendingDown, Zap,
  ChevronRight, CheckCircle2, FileText, MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence, useSpring } from "motion/react";

// ── Magnetic button ───────────────────────────────────────────────────────────
function MagBtn({
  children, onClick, className, disabled, type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useSpring(0, { stiffness: 180, damping: 16 });
  const y = useSpring(0, { stiffness: 180, damping: 16 });

  function onMove(e: React.MouseEvent) {
    if (disabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.26);
    y.set((e.clientY - r.top - r.height / 2) * 0.26);
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.button
      ref={ref}
      type={type}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ text, speed = 46 }: { text: string; speed?: number }) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setOut(""); setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(t); setDone(true); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);

  return (
    <span>
      {out}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          className="inline-block w-[2px] h-[1em] bg-zinc-800 ml-[2px] align-[-2px]"
        />
      )}
    </span>
  );
}

// ── Generating overlay ────────────────────────────────────────────────────────
const G_MESSAGES = [
  { text: "Lese und verstehe deine gesamte Konversation...", ms: 0 },
  { text: "Identifiziere aktuelle IT-Probleme und Pain Points...", ms: 3800 },
  { text: "Analysiere Transformationspotenziale...", ms: 7400 },
  { text: "Berechne Business Value und erwarteten ROI...", ms: 11200 },
  { text: "Entwickle konkrete Transformationsschritte...", ms: 15000 },
  { text: "Formuliere User Stories für dein Entwicklungsteam...", ms: 18600 },
  { text: "Erstelle die finale Zusammenfassung...", ms: 22000 },
];

function GeneratingOverlay() {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    const timers = G_MESSAGES.map((m, i) =>
      setTimeout(() => {
        setCurrent(i);
        if (i > 0) setDone(prev => [...prev, i - 1]);
      }, m.ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-white"
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.04, 0.08, 0.04] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, #16a34a, transparent)" }}
      />

      <div className="relative w-full max-w-sm px-8">
        <div className="flex justify-center mb-14">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-green-600/25"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            style={{ fontFamily: "Georgia, serif" }}
          >
            B
          </motion.div>
        </div>

        <div className="flex flex-col gap-4">
          {G_MESSAGES.map((m, i) => {
            if (i > current) return null;
            const isDone = done.includes(i);
            const isCurrent = i === current;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isDone ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.3, bounce: 0.4 }}>
                      <CheckCircle2 className="w-4 h-4 text-green-500" strokeWidth={2} />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="w-2 h-2 rounded-full bg-green-600" />
                  ) : null}
                </div>
                <span className={`text-sm leading-relaxed ${isDone ? "text-zinc-400" : isCurrent ? "text-zinc-900 font-medium" : "text-zinc-400"}`}>
                  {isCurrent ? <Typewriter text={m.text} speed={46} /> : m.text}
                </span>
              </motion.div>
            );
          })}
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="mt-12 text-center text-xs text-zinc-400">
          Das dauert typischerweise 15–30 Sekunden
        </motion.p>
      </div>
    </motion.div>
  );
}

// ── KPI meta ──────────────────────────────────────────────────────────────────
const KPI_META = [
  { key: "manual_effort", label: "Zeitersparnis",   sub: "Manuelle Aufwände", Icon: Clock },
  { key: "error_rate",    label: "Fehlerrate",       sub: "Reduzierung",       Icon: AlertTriangle },
  { key: "cost_savings",  label: "Kostenersparnis",  sub: "Pro Jahr",          Icon: TrendingDown },
] as const;

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      className={`bg-zinc-100 rounded-lg ${className ?? ""}`}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function ConceptContent() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const params = useSearchParams();
  const urlSession = params.get("session");
  const sessionId = urlSession || store.sessionId;
  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [openStep, setOpenStep] = useState<number | null>(null);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);

  // Load history if not loaded yet
  useEffect(() => {
    if (token && !store.history.length) {
      api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
    }
  }, [token]);

  // Load concept when we have a session with messages
  useEffect(() => {
    if (!token || !sessionId || !store.messages.length) return;
    setConceptLoading(true);
    api.getConcept(token, sessionId)
      .then(d => { if (d?.concept) setConcept(d.concept); })
      .catch(() => {})
      .finally(() => setConceptLoading(false));
  }, [token, sessionId, store.messages.length]);

  // Also load concept immediately if URL has ?session= param
  useEffect(() => {
    if (!token || !urlSession) return;
    setConceptLoading(true);
    api.getConcept(token, urlSession)
      .then(d => { if (d?.concept) setConcept(d.concept); })
      .catch(() => {})
      .finally(() => setConceptLoading(false));
  }, [token, urlSession]);

  async function selectSession(sid: string) {
    if (!token) return;
    try {
      const s = await api.getSession(token, sid);
      store.setSessionId(sid);
      store.setSessionTitle(s.title || "Konversation");
      store.setMessages(s.messages ?? []);
      // Try to load existing concept immediately
      setConceptLoading(true);
      const d = await api.getConcept(token, sid).catch(() => null);
      if (d?.concept) setConcept(d.concept);
      setConceptLoading(false);
    } catch {}
  }

  async function generate() {
    if (!token) return;
    setGenerating(true); setError("");
    try {
      const msgs = store.messages;
      if (!msgs.length) {
        setError("Wähle zuerst eine Konversation aus.");
        setGenerating(false); return;
      }
      const res = await api.generateConcept(token, { messages: msgs, session_id: sessionId });
      setConcept(res.concept);
      await api.saveConcept(token, res.session_id, res.concept);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setGenerating(false); }
  }

  const steps    = concept?.transformation_steps ?? [];
  const stories  = concept?.user_stories ?? [];
  const bv       = concept?.business_value_summary ?? {};
  const now       = concept?.now ?? {};
  const goal      = concept?.goal ?? {};
  const pains     = now.pain_points ?? [];
  const outcomes  = goal.outcomes ?? [];
  const goalTable = goal.table ?? [];

  const kpiItems = KPI_META
    .map(m => ({ ...m, val: (bv as Record<string, string | undefined>)[m.key] }))
    .filter(k => k.val);

  const hasMessages = store.messages.length > 0;
  // All conversations (project chats included) can carry a concept.
  const loose = store.history;

  if (loading || !token) return (
    <div className="flex bg-white" style={{ height: "100vh" }}>
      <div className="w-60 border-r border-zinc-200 shrink-0" />
      <div className="flex-1 flex items-center justify-center">
        <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
      </div>
    </div>
  );

  return (
    <AppShell active="concept">
      <div className="flex-1 flex flex-col relative min-h-0" style={{ overflow: "hidden" }}>
        {/* Generating overlay */}
        <AnimatePresence>{generating && <GeneratingOverlay />}</AnimatePresence>

        {/* Page toolbar (page-specific actions live here) */}
        <div className="flex items-center gap-2.5 px-4 md:px-6 h-12 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
              {concept?.title || (hasMessages ? store.sessionTitle : "Transformation Concept")}
            </p>
            {concept && (
              <p className="text-xs text-zinc-400">{steps.length} Maßnahmen · {stories.length} User Stories</p>
            )}
          </div>

          {concept && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150"
            >
              <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
              PDF
            </motion.button>
          )}

          {hasMessages && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-zinc-300 transition-colors duration-150 rounded-lg px-3.5 py-1.5 shadow-sm shadow-green-600/20"
            >
              <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
              {concept ? "Neu generieren" : "Generieren"}
            </motion.button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-10 pb-20">

            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0 }}
              className="mb-8 pb-7 border-b border-zinc-100"
            >
              <p className="text-xs tracking-widest text-zinc-400 uppercase mb-3">Transformation Concept</p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                {concept?.title || "Noch kein Concept generiert"}
              </h1>
            </motion.div>

            {/* ── Loading skeleton ─────────────────────────────────────────── */}
            {conceptLoading && !concept && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="bg-white border border-zinc-100 rounded-xl p-6">
                      <Skeleton className="h-3 w-20 mb-4" />
                      <Skeleton className="h-7 w-28 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-zinc-100 rounded-xl p-6">
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-4/5 mb-2" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
            )}

            {/* ── No session: show history to pick ───────────────────────── */}
            {!concept && !conceptLoading && !hasMessages && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.05, delay: 0.05 }}
              >
                {loose.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
                      Konversation auswählen
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {loose.map((s, i) => (
                        <motion.button
                          key={s.session_id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", duration: 0.4, bounce: 0.05, delay: i * 0.04 }}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => selectSession(s.session_id)}
                          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-zinc-200 bg-white hover:border-green-200 hover:bg-green-50/30 hover:shadow-sm transition-all duration-150 text-left group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0 group-hover:border-green-200 group-hover:bg-green-50 transition-colors duration-150">
                            <MessageSquare className="w-4 h-4 text-zinc-400 group-hover:text-green-600 transition-colors duration-150" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate mb-0.5">
                              {s.title || "Untitled Konversation"}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {s.message_count} Nachrichten · {dateStr(s.saved_at)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-green-500 transition-colors duration-150 flex-shrink-0" strokeWidth={1.5} />
                        </motion.button>
                      ))}
                    </div>
                    <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        onClick={() => router.push("/chat")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors duration-150"
                      >
                        <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                        Oder neuen Chat starten
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm px-10 py-16 text-center relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(22,163,74,0.04), transparent)" }} />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">Erst mit dem Agenten chatten</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-8 leading-relaxed">
                      Starte ein Gespräch mit dem BI Agent. Die KI erstellt dann hier ein strukturiertes Transformation Concept.
                    </p>
                    <motion.button whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      onClick={() => router.push("/chat")}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors duration-150 rounded-xl px-6 py-3 shadow-md">
                      <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                      Chat öffnen
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Has session, no concept yet ──────────────────────────────── */}
            {!concept && !conceptLoading && hasMessages && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.05, delay: 0.05 }}
                className="rounded-2xl border border-zinc-200 bg-white shadow-sm px-10 py-16 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(22,163,74,0.04), transparent)" }} />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Concept generieren</h3>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-8 leading-relaxed">
                  Die KI analysiert deine Konversation und erstellt ein strukturiertes Transformation Concept mit Business Value, Schritten und User Stories.
                </p>
                {error && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 inline-block">
                    {error}
                  </motion.p>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  onClick={generate}
                  disabled={generating}
                  className="inline-flex items-center gap-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-zinc-300 transition-colors duration-150 rounded-xl px-7 py-3.5 shadow-md shadow-green-600/20"
                >
                  <Zap className="w-4 h-4" strokeWidth={1.5} />
                  Concept generieren
                </motion.button>
                <div className="mt-10 grid grid-cols-3 gap-4 max-w-xs mx-auto">
                  {[
                    { icon: Clock,        label: "Business Value", sub: "ROI & Zeit" },
                    { icon: Zap,          label: "Schritte",       sub: "Aktionsplan" },
                    { icon: CheckCircle2, label: "User Stories",   sub: "Für dein Team" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-1.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-xs font-semibold text-zinc-700">{label}</p>
                      <p className="text-xs text-zinc-400">{sub}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Concept content ──────────────────────────────────────────── */}
            {concept && (
              <div className="flex flex-col gap-5">

                {/* Ziel-Zustand FIRST — as a table: Ziel | Bestes Tooling | Alternativen */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0 }}
                  className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-zinc-900">Ziel-Zustand</h2>
                    {goal.summary && <span className="text-xs text-zinc-400 truncate max-w-[50%]">{goal.summary}</span>}
                  </div>
                  {goalTable.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-zinc-50">
                          <tr>
                            {["Ziel-Zustand", "Annahme bestes Tooling", "Mögliche Alternativen"].map(h => (
                              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {goalTable.map((row, i) => (
                            <tr key={i} className="border-t border-zinc-100 hover:bg-zinc-50/60 align-top">
                              <td className="px-5 py-3.5 text-sm text-zinc-800 font-medium leading-snug">{row.ziel}</td>
                              <td className="px-5 py-3.5 text-sm text-zinc-600 leading-snug">{row.tooling}</td>
                              <td className="px-5 py-3.5">
                                <ul className="space-y-1">
                                  {(row.alternativen ?? []).map((a, j) => (
                                    <li key={j} className="flex gap-2 items-start text-sm text-zinc-500 leading-snug">
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0 mt-1.5" />
                                      {a}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ul className="px-6 py-4 space-y-2">
                      {outcomes.map((o, i) => (
                        <li key={i} className="flex gap-2.5 items-start text-sm text-zinc-700 leading-snug">
                          <span className="w-2 h-2 rounded-full bg-zinc-400 flex-shrink-0 mt-1.5" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>

                {/* Ist-Zustand as a compact table */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0, delay: 0.06 }}
                  className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-zinc-900">Ist-Zustand</h2>
                    {now.summary && <span className="text-xs text-zinc-400 truncate max-w-[50%]">{now.summary}</span>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Schwachpunkt heute</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pains.map((p, i) => (
                          <tr key={i} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                            <td className="px-5 py-3 text-sm text-zinc-600 leading-snug flex gap-2.5 items-start">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0 mt-1.5" />
                              {p}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {kpiItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {kpiItems.map(({ label, val, sub, Icon }, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.08, delay: i * 0.08 }}
                        whileHover={{ y: -2 }}
                        className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200 cursor-default"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs tracking-widest text-zinc-500 uppercase">{label}</p>
                          <Icon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                        </div>
                        <p className="text-2xl font-bold text-zinc-900 tracking-tight leading-none mb-1.5 break-words">{val}</p>
                        <p className="text-xs text-zinc-400">{sub}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {steps.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0, delay: 0.2 }}
                    className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-zinc-900">Transformationsschritte</h2>
                      <span className="text-xs text-zinc-400">{steps.length} Schritte</span>
                    </div>
                    {steps.map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.22 + i * 0.06 }}
                        className={i < steps.length - 1 ? "border-b border-zinc-100" : ""}>
                        <motion.button
                          whileTap={{ scale: 0.99 }}
                          className="w-full text-left px-6 py-5 flex gap-4 items-start hover:bg-zinc-50/70 transition-colors duration-150"
                          onClick={() => setOpenStep(openStep === i ? null : i)}
                        >
                          <motion.div whileHover={{ scale: 1.05 }}
                            className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                            {i + 1}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-zinc-900">{s.title}</span>
                              {s.effort && <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 font-mono">{s.effort}</span>}
                            </div>
                            {s.business_value && <p className="text-xs text-green-600 font-medium">{s.business_value}</p>}
                          </div>
                          <motion.span
                            animate={{ rotate: openStep === i ? 90 : 0 }}
                            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
                            className="text-zinc-300 mt-0.5 flex-shrink-0"
                          >
                            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                          </motion.span>
                        </motion.button>
                        <AnimatePresence initial={false}>
                          {openStep === i && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: "spring", duration: 0.4, bounce: 0.05 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-5 pt-1 ml-11">
                                {s.description && <p className="text-sm leading-relaxed text-zinc-600 mb-3">{s.description}</p>}
                                {s.implementation_ideas?.length ? (
                                  <div className="flex flex-wrap gap-2">
                                    {s.implementation_ideas.map((idea, j) => (
                                      <motion.span key={j}
                                        initial={{ opacity: 0, scale: 0.92 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: j * 0.04, type: "spring", duration: 0.3 }}
                                        className="text-xs px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-500">
                                        {idea}
                                      </motion.span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {stories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0, delay: 0.28 }}
                    className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-zinc-900">User Stories</h2>
                      <span className="text-xs text-zinc-400">Product Owner</span>
                    </div>
                    {stories.map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.06 }}
                        className={`px-6 py-5 flex gap-4 ${i < stories.length - 1 ? "border-b border-zinc-100" : ""}`}>
                        <motion.div whileHover={{ scale: 1.05 }}
                          className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 flex-shrink-0 mt-0.5">
                          {s.size || "M"}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 mb-1">{s.title}</p>
                          <p className="text-sm leading-relaxed text-zinc-500 mb-2">{s.story}</p>
                          {s.acceptance_criteria && (
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                              {s.acceptance_criteria}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ConceptPage() {
  return (
    <Suspense fallback={
      <div className="flex bg-white" style={{ height: "100vh" }}>
        <div className="w-60 border-r border-zinc-200 shrink-0" />
        <div className="flex-1 flex items-center justify-center">
          <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
        </div>
      </div>
    }>
      <ConceptContent />
    </Suspense>
  );
}
