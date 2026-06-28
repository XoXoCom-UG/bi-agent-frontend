"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, DeckRow, RoadmapData } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import {
  MessageSquare, Zap, Map, ArrowLeft, RefreshCw,
  ArrowRight, CheckCircle2, ChevronDown, Copy, Check,
} from "lucide-react";
import {
  motion, AnimatePresence, useMotionValue, useSpring, useTransform,
} from "motion/react";

// ── Magnetic button ──────────────────────────────────────────────────────────
function MagneticButton({
  children, onClick, className, disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 18 });
  const y = useSpring(0, { stiffness: 200, damping: 18 });

  function handleMouseMove(e: React.MouseEvent) {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.28);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.28);
  }

  function handleMouseLeave() {
    x.set(0); y.set(0);
  }

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={disabled ? {} : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// ── Spotlight card ────────────────────────────────────────────────────────────
function SpotlightCard({ children, className, delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [2.5, -2.5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-2.5, 2.5]), { stiffness: 300, damping: 30 });
  const [spot, setSpot] = useState({ x: 0, y: 0, visible: false });

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(nx); mouseY.set(ny);
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
  }

  function handleMouseLeave() {
    mouseX.set(0); mouseY.set(0);
    setSpot(s => ({ ...s, visible: false }));
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.08, delay }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className ?? ""}`}
    >
      {/* Spotlight gradient */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-opacity duration-300"
        style={{
          opacity: spot.visible ? 1 : 0,
          background: `radial-gradient(200px circle at ${spot.x}px ${spot.y}px, rgba(22,163,74,0.06), transparent 70%)`,
        }}
      />
      {/* Spotlight border */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-opacity duration-300"
        style={{
          opacity: spot.visible ? 1 : 0,
          background: `radial-gradient(160px circle at ${spot.x}px ${spot.y}px, rgba(22,163,74,0.15), transparent 70%)`,
          WebkitMask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
          borderRadius: "12px",
        }}
      />
      {children}
    </motion.div>
  );
}

// ── Step accordion ────────────────────────────────────────────────────────────
function StepCard({ step, index }: { step: NonNullable<RoadmapData["phases"]>[0]["steps"][0]; index: number }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    const text = [step.title, step.what, step.why].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function verdictStyle(v: string) {
    const l = v?.toLowerCase() ?? "";
    if (l.includes("empf")) return "bg-green-50 text-green-700 border-green-200";
    if (l.includes("vorsicht") || l.includes("nicht")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0.05, delay: index * 0.07 }}
      className={`relative bg-white dark:bg-zinc-900 border rounded-xl shadow-sm transition-all duration-200 ${done ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20" : "border-zinc-200 dark:border-zinc-800 hover:shadow-md"}`}
    >
      {/* Timeline dot */}
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.4, delay: index * 0.07 + 0.15 }}
        className={`absolute -left-[25px] top-5 w-2.5 h-2.5 rounded-full border-2 border-zinc-50 ${done ? "bg-green-500" : "bg-green-600"}`}
      />

      {/* Header row */}
      <button
        className="w-full text-left px-5 py-4 flex items-start gap-3 group"
        onClick={() => setOpen(o => !o)}
      >
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
          className="mt-0.5 flex-shrink-0 text-zinc-300 group-hover:text-zinc-500 transition-colors"
        >
          <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
        </motion.span>
        <span className={`flex-1 text-sm font-semibold leading-snug ${done ? "text-zinc-400 dark:text-zinc-600 line-through" : "text-zinc-900 dark:text-zinc-50"}`}>
          {step.title}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {step.effort && (
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-0.5">
              {step.effort}
            </span>
          )}
          <button
            onClick={copy}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
          >
            <motion.span
              key={copied ? "check" : "copy"}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.2, bounce: 0.3 }}
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={2} />
                : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              }
            </motion.span>
          </button>
          <button
            onClick={() => setDone(d => !d)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 ${done ? "text-green-500 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900/40" : "text-zinc-300 dark:text-zinc-600 hover:text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={done ? 2 : 1.5} />
          </button>
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.05 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              {step.what && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-2">{step.what}</p>
              )}
              {step.why && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                  <span className="font-semibold text-green-600">Warum: </span>{step.why}
                </p>
              )}

              {step.tools && step.tools.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {step.tools.map((tool, ti) => (
                    <motion.div
                      key={tool.name}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", duration: 0.3, bounce: 0.05, delay: ti * 0.05 }}
                      className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg p-3.5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-1">{tool.name}</span>
                        {tool.verdict && (
                          <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${verdictStyle(tool.verdict)}`}>
                            {tool.verdict}
                          </span>
                        )}
                      </div>
                      {tool.why && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2.5">{tool.why}</p>
                      )}
                      {(tool.pros?.length || tool.cons?.length) && (
                        <div className="grid grid-cols-2 gap-3">
                          {tool.pros?.length ? (
                            <div>
                              <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1.5">Dafür</p>
                              {tool.pros.map((p, i) => <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">· {p}</p>)}
                            </div>
                          ) : null}
                          {tool.cons?.length ? (
                            <div>
                              <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1.5">Dagegen</p>
                              {tool.cons.map((c, i) => <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">· {c}</p>)}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
function DashboardContent() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const params = useSearchParams();
  const [deck, setDeck] = useState<DeckRow[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [rmSession, setRmSession] = useState<string | null>(null);
  const [rmLoading, setRmLoading] = useState(false);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  useEffect(() => {
    if (!token) return;
    api.getDeck(token, 200).then(d => { setDeck(d.deck); setDeckLoading(false); }).catch(() => setDeckLoading(false));
  }, [token]);
  useEffect(() => {
    const s = params.get("session");
    if (s && token) openRoadmap(s);
  }, [params, token]);

  async function openRoadmap(sid: string) {
    setRmSession(sid); setRmLoading(true); setRoadmap(null);
    try { const d = await api.generateRoadmap(token!, sid); setRoadmap(d.roadmap); } catch {} finally { setRmLoading(false); }
  }

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
      <div className="thinking-spinner" style={{ width: 24, height: 24 }} />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar currentPath="/dashboard" />

      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Topbar */}
        <div className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6 gap-3 flex-shrink-0">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Roadmap</h1>
        </div>

        {/* Deck */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className="mb-6"
            >
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">Deck</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Alle Konversationen. Öffne Concept oder Roadmap.</p>
            </motion.div>

            {/* Skeleton */}
            {deckLoading && (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl h-[88px] overflow-hidden"
                  >
                    <div className="h-full bg-gradient-to-r from-zinc-100 via-zinc-50 to-zinc-100 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-700 animate-pulse" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!deckLoading && deck.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm px-10 py-16 text-center"
              >
                <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-5 h-5 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Noch keine Konversationen</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Starte einen Chat und komm dann hierher zurück.</p>
                <MagneticButton
                  onClick={() => router.push("/chat")}
                  className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 rounded-lg px-5 py-2.5 inline-flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                  Chat starten
                </MagneticButton>
              </motion.div>
            )}

            {/* Cards */}
            <div className="flex flex-col gap-3">
              {deck.map((row, i) => (
                <SpotlightCard
                  key={row.session_id}
                  delay={i * 0.055}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm"
                >
                  <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-0.5 leading-snug">
                        {row.title || "Konversation"}
                      </h3>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                        {row.message_count} Nachrichten · {new Date(row.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    {row.has_concept && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" strokeWidth={2} />
                        Concept
                      </span>
                    )}
                  </div>

                  <div className="px-4 pb-3.5 flex items-center gap-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
                    {/* Icon ghost buttons */}
                    <motion.button
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      onClick={() => { store.setSessionId(row.session_id); router.push("/chat"); }}
                      title="Chat öffnen"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
                    >
                      <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                    </motion.button>

                    <motion.button
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      onClick={() => router.push(`/concept?session=${row.session_id}`)}
                      title="Concept öffnen"
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 relative"
                      style={{ color: row.has_concept ? "#16a34a" : undefined }}
                    >
                      <span className={row.has_concept ? "text-green-600" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"}>
                        <Zap className="w-4 h-4" strokeWidth={1.5} />
                      </span>
                      {row.has_concept && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                      )}
                    </motion.button>

                    {/* Primary CTA */}
                    <div className="ml-auto">
                      {row.has_concept ? (
                        <motion.button
                          whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                          onClick={() => openRoadmap(row.session_id)}
                          className="flex items-center gap-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 rounded-lg px-4 py-2 shadow-sm shadow-green-600/20"
                        >
                          <Map className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Roadmap
                        </motion.button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 dark:text-zinc-600 px-2 py-1.5 cursor-not-allowed">
                          <Map className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Roadmap
                        </span>
                      )}
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </div>

        {/* Roadmap panel — AnimatePresence slide-in from right */}
        <AnimatePresence>
          {(roadmap || rmLoading) && (
            <motion.div
              key="roadmap"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.08 }}
              className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950 z-20 flex flex-col overflow-hidden"
            >
              {/* Roadmap topbar */}
              <div className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6 gap-3 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setRoadmap(null); setRmSession(null); }}
                  className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Deck
                </motion.button>
                <h2 className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {roadmap?.title || "Roadmap"}
                </h2>
                {rmSession && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => openRoadmap(rmSession)}
                    className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Neu generieren
                  </motion.button>
                )}
              </div>

              {/* Roadmap body */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-6 py-8">

                  {/* Loading */}
                  {rmLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-20"
                    >
                      <div className="thinking-spinner mx-auto mb-4" style={{ width: 28, height: 28 }} />
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">KI generiert die Roadmap...</p>
                      <p className="text-xs text-zinc-400">Beim ersten Mal dauert es einen Moment.</p>
                    </motion.div>
                  )}

                  {roadmap && !rmLoading && (
                    <div className="flex flex-col gap-10">

                      {/* Flow strip */}
                      {roadmap.phases && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                        >
                          <p className="text-xs tracking-widest text-zinc-400 uppercase mb-4">Ablauf</p>
                          {/* Premium horizontal timeline */}
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm overflow-x-auto">
                            <div className="flex items-start gap-0 min-w-max">
                              {roadmap.phases.flatMap(ph => ph.steps).map((step, i, arr) => (
                                <div key={step.id} className="flex items-start">
                                  <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: "spring", duration: 0.4, bounce: 0.1, delay: i * 0.05 }}
                                    className="flex flex-col items-center gap-2"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold flex-shrink-0 shadow-sm">
                                      {i + 1}
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center max-w-[72px] leading-tight font-medium">{step.title}</p>
                                  </motion.div>
                                  {i < arr.length - 1 && (
                                    <div className="flex items-center mx-2 mt-3.5">
                                      <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-700" />
                                      <ArrowRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 -ml-1.5 flex-shrink-0" strokeWidth={2} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Phases */}
                      {roadmap.phases?.map((ph, pi) => (
                        <motion.div
                          key={pi}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", duration: 0.4, bounce: 0, delay: pi * 0.08 }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-mono font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full px-2.5 py-0.5">
                              Phase {pi + 1}
                            </span>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">{ph.name}</h3>
                          </div>
                          {ph.goal && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 ml-px">{ph.goal}</p>
                          )}

                          {/* Timeline */}
                          <div className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-6 ml-1.5 flex flex-col gap-3">
                            {ph.steps.map((step, si) => (
                              <StepCard key={step.id} step={step} index={si} />
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
    </div>
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
