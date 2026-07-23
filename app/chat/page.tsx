"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { md } from "@/lib/markdown";
import { AppShell } from "@/components/layout/app-shell";
import { DEMO_MESSAGES } from "@/lib/demo";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, ArrowUp, ArrowRight, MessageSquare, CheckCircle2, Copy, Check,
  Folder, Plus, LayoutDashboard, Sparkles, Wrench, ShieldCheck, Server, Lock,
} from "lucide-react";

// ── Phase list (long, non-repeating within a response) ───────────────────────
const PHASES_CHAT = [
  "Lese deine Frage…",
  "Verstehe den Kontext…",
  "Analysiere relevante Aspekte…",
  "Denke über Lösungsansätze nach…",
  "Strukturiere die Antwort…",
  "Überprüfe Vollständigkeit…",
  "Formuliere finale Antwort…",
];

const BTN_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

// ── Home hero: rotating accent word (blur-rise) ───────────────────────────────
const ROTATE_WORDS = [
  "Ziele erreicht",
  "Kosten senkst",
  "Prozesse automatisierst",
  "Risiken reduzierst",
  "Systeme modernisierst",
];
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI(v => (v + 1) % ROTATE_WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="mf-slot text-green-600">
      <span key={i} className="mf-rotator">{ROTATE_WORDS[i]}</span>
    </span>
  );
}

// ── Home hero: interactive background (aurora at rest → dot-field at cursor) ───
function WelcomeBackground() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let idle: ReturnType<typeof setTimeout>;
    function onMove(e: PointerEvent) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return; // pointer outside hero
      dotRef.current?.style.setProperty("--mx", `${x}px`);
      dotRef.current?.style.setProperty("--my", `${y}px`);
      if (glowRef.current) { glowRef.current.style.left = `${x}px`; glowRef.current.style.top = `${y}px`; }
      setInteracting(true);
      clearTimeout(idle);
      idle = setTimeout(() => setInteracting(false), 2200);
    }
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("pointermove", onMove); clearTimeout(idle); };
  }, []);
  return (
    <div ref={wrapRef} aria-hidden="true"
      className={cn("mf-bg pointer-events-none absolute inset-0 overflow-hidden", interacting && "mf-interacting")}>
      <div className="mf-aurora mf-aurora-1" />
      <div className="mf-aurora mf-aurora-2" />
      <div ref={dotRef} className="mf-dotfield" />
      <div ref={glowRef} className="mf-cursor-glow" />
    </div>
  );
}

// ── Thinking bubble with accumulated phases ───────────────────────────────────
function ThinkingBubble({ phases, current }: { phases: string[]; current: number }) {
  const visiblePhases = phases.slice(0, Math.min(current + 1, phases.length));

  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 min-w-[220px]">
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {visiblePhases.map((phase, idx) => {
            const isDone = idx < current;
            const isCurrent = idx === current || idx === visiblePhases.length - 1;
            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                className="flex items-center gap-2.5"
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" strokeWidth={2} />
                ) : (
                  <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse block" />
                  </span>
                )}
                <span className={cn(
                  "text-[12.5px] leading-snug transition-colors",
                  isDone
                    ? "text-zinc-400 dark:text-zinc-500 line-through"
                    : "text-zinc-700 dark:text-zinc-200 font-medium"
                )}>
                  {phase}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((b: unknown) => {
      if (typeof b === "string") return b;
      if (b && typeof b === "object" && "text" in b && typeof (b as { text: unknown }).text === "string")
        return (b as { text: string }).text;
      return "";
    }).join("");
  return "";
}

function ChoiceChips({ choices, onSelect }: { choices: string[]; onSelect: (c: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="mt-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3 space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {choices.map(c => (
          <button key={c} disabled={!!picked} onClick={() => { setPicked(c); onSelect(c); }}
            className={cn("choice-chip", picked === c && "chosen")}>{c}</button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-400">Wähle eine Option — oder schreib deine eigene Antwort.</p>
    </div>
  );
}

// Multi-select variant: pick several options, then submit.
function MultiChoiceChips({ choices, onSubmit }: { choices: string[]; onSubmit: (c: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  function toggle(c: string) {
    setSelected(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }
  return (
    <div className="mt-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3 space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {choices.map(c => {
          const on = selected.includes(c);
          return (
            <button key={c} disabled={sent} onClick={() => toggle(c)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] transition-colors duration-150",
                on
                  ? "border-green-500 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 font-medium"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-green-300"
              )}>
              <span className={cn("w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0",
                on ? "bg-green-600 border-green-600" : "border-zinc-300 dark:border-zinc-600")}>
                {on && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </span>
              {c}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={selected.length === 0 || sent}
          onClick={() => { setSent(true); onSubmit(selected.join(", ")); }}
          className={cn("text-xs font-semibold rounded-lg px-3.5 py-1.5 transition-colors duration-150",
            selected.length > 0 && !sent
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-default")}>
          {selected.length > 0 ? `${selected.length} auswählen →` : "Auswählen"}
        </button>
        <span className="text-xs text-zinc-400">Mehrere möglich — oder schreib deine eigene Antwort.</span>
      </div>
    </div>
  );
}

// ── Message actions (copy — right-aligned) ────────────────────────────────────
function MsgActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-end w-full gap-1 mt-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
      <button
        onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        title="Kopieren"
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
      >
        {copied
          ? <Check className="w-3 h-3 text-green-500" strokeWidth={2} />
          : <Copy className="w-3 h-3" strokeWidth={1.5} />}
        {copied ? "Kopiert" : "Kopieren"}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Text selection → "discuss with agent" floating button (feeds the shared panel)
  const msgListRef = useRef<HTMLDivElement>(null);
  const [selBtn, setSelBtn] = useState<{ x: number; y: number; text: string } | null>(null);

  // Inline project creation on the welcome screen
  const [projSaving, setProjSaving] = useState(false);
  // "Starte Projekt" clicked → reveal the left agent's composer directly.
  const [startedProject, setStartedProject] = useState(false);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  // Keep the message list pinned to the newest content — scroll ONLY the list
  // container, never the whole page (that caused the jump-to-top annoyance).
  useEffect(() => {
    const el = msgListRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [store.messages, store.sending]);

  // Feed the right-side assistant with the current conversation as context.
  useEffect(() => {
    const recent = store.messages.slice(-6)
      .map(m => `${m.role === "user" ? "Nutzer" : "matfit.ai"}: ${toText(m.content).slice(0, 400)}`)
      .filter(l => l.split(": ")[1]?.trim())
      .join("\n");
    store.setLeftContext(recent ? `Aktuelle Konversation im Chat:\n${recent}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.messages]);

  const activeProject = store.projects.find(p => p.project_id === store.activeProjectId) ?? null;

  // Back to the true welcome screen (e.g. logo → newChat) resets the reveal.
  useEffect(() => {
    if (!store.activeProjectId && store.messages.length === 0) setStartedProject(false);
  }, [store.activeProjectId, store.messages.length]);

  const allPhases = PHASES_CHAT;

  function startThinking() {
    store.setSending(true);
    setPhaseIdx(0);
    timerRef.current = setInterval(() => {
      setPhaseIdx(i => Math.min(i + 1, allPhases.length - 1));
    }, 2000);
  }
  function stopThinking() {
    store.setSending(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPhaseIdx(0);
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || !token || store.sending) return;
    setInput("");
    const userMsg = { role: "user" as const, content: t };
    if (store.messages.length === 0) store.setSessionTitle(t.slice(0, 55));
    store.addMessage(userMsg);
    startThinking();
    try {
      const res = await api.chat(token, { messages: [...store.messages, userMsg], session_id: store.sessionId, project_id: store.activeProjectId, guided: store.guidedProject });
      store.setMessages(res.messages);
      store.setSessionId(res.session_id);
      // NOTE: guided mode stays ON for the whole interview — it used to reset
      // after the first message, which made the agent drop the interview and
      // jump straight to giving ideas. It is turned off only when the concept
      // is generated or a new chat starts.
      api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
      // Refresh consent flags (the agent may have recorded permissions this turn)
      api.getProjects(token).then(d => store.setProjects(d.projects)).catch(() => {});
    } catch (e: unknown) {
      store.addMessage({ role: "assistant", content: `**Fehler:** ${(e as Error).message}` });
    } finally { stopThinking(); }
  }

  // "Starte Projekt" → reveal the left agent's text field right away (no name
  // prompt), start the guided interview, and create the project in the
  // background so it stays scoped/saved.
  async function startProjectDirect() {
    if (!token || projSaving) return;
    setProjSaving(true);
    store.newChat();
    store.setGuidedProject(true);
    setStartedProject(true);
    setTimeout(() => inputRef.current?.focus(), 80);
    try {
      const p = await api.createProject(token, "Neues Projekt");
      store.setProjects([p, ...store.projects]);
      store.setActiveProject(p.project_id);
    } catch {} finally { setProjSaving(false); }
  }

  // Selection inside the message list → floating "discuss" button
  function handleMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    const container = msgListRef.current;
    if (!sel || !container || text.length < 8 || !sel.anchorNode || !container.contains(sel.anchorNode)) {
      setSelBtn(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const parent = container.getBoundingClientRect();
    setSelBtn({
      x: rect.left - parent.left + rect.width / 2,
      y: rect.top - parent.top + container.scrollTop,
      text: text.slice(0, 600),
    });
  }

  function askAboutSelection() {
    if (!selBtn) return;
    store.pushAssistant({ quote: selBtn.text });
    setSelBtn(null);
    window.getSelection()?.removeAllRanges();
  }

  // During the onboarding tour we show a bundled example conversation.
  const demo = store.demoActive;
  const msgs = demo ? DEMO_MESSAGES : store.messages;
  const turns = store.messages.filter(m => m.role === "user").length;
  const canSend = !!input.trim() && !store.sending;
  const lastAssistantIdx = (() => {
    for (let i = msgs.length - 1; i >= 0; i--)
      if (msgs[i].role === "assistant") return i;
    return -1;
  })();

  if (loading || !token) return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Topbar skeleton */}
      <div className="h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 px-5 shrink-0">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-8 w-24 rounded-lg ml-2" />
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="flex-1" />
        <div className="skeleton h-8 w-8 rounded-full" />
      </div>
      {/* Body skeleton */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="skeleton h-9 w-72 max-w-[80%]" />
          <div className="skeleton h-9 w-96 max-w-[80%]" />
          <div className="skeleton h-4 w-64 max-w-[70%] mt-2" />
          <div className="skeleton h-16 w-full max-w-sm rounded-2xl mt-6" />
        </div>
        <div className="hidden lg:flex flex-col gap-3 w-[320px] border-l border-zinc-100 dark:border-zinc-800 p-4">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-16 w-full rounded-xl mt-2" />
          <div className="skeleton h-9 w-full rounded-lg" />
          <div className="skeleton h-9 w-full rounded-lg" />
          <div className="skeleton h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );

  // The welcome screen (no project, no conversation) only offers "Starte Projekt".
  // Showing a chat bar there is misleading, so the composer is hidden until the
  // user is actually in a project or a conversation.
  const onWelcome = msgs.length === 0 && !store.sending && !activeProject;

  return (
    <AppShell active="chat">
        {/* Messages / Project hub / Welcome */}
        <div className="flex-1 overflow-y-auto relative" ref={msgListRef} onMouseUp={handleMouseUp}>
          {/* Floating "discuss selection" button */}
          <AnimatePresence>
            {selBtn && (
              <motion.button
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={BTN_SPRING}
                onClick={askAboutSelection}
                className="absolute z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-lg -translate-x-1/2 -translate-y-full"
                style={{ left: selBtn.x, top: selBtn.y - 8 }}
              >
                <MessageSquare className="w-3 h-3" strokeWidth={2} />
                Mit Agent diskutieren
              </motion.button>
            )}
          </AnimatePresence>

          {msgs.length === 0 && !store.sending && activeProject && !startedProject ? (
            /* ── Project hub: the three buttons, centered ── */
            <div className="flex flex-col items-center justify-center min-h-full px-6 py-16">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.08 }}
                className="w-full max-w-md text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-3 text-green-600">
                  <Folder className="w-4 h-4" strokeWidth={1.5} />
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">Projekt</p>
                </div>
                <h2 className="text-[26px] font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight mb-2"
                  style={{ letterSpacing: "-0.02em" }}>
                  {activeProject.name}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                  Wie möchtest du weitermachen?
                </p>
                <div className="grid grid-cols-1 gap-3 text-left">
                  {[
                    {
                      icon: <MessageSquare className="w-4 h-4" strokeWidth={1.5} />,
                      label: "Starte Projekt",
                      sub: "Geführtes Interview — der Agent lernt dich und dein Projekt kennen.",
                      accent: true,
                      action: () => { store.setGuidedProject(true); inputRef.current?.focus(); },
                    },
                    {
                      icon: <Zap className="w-4 h-4" strokeWidth={1.5} />,
                      label: "Konzept",
                      sub: "Ist-Zustand, Ziel-Zustand & Tooling als strukturierte Tabellen.",
                      accent: false,
                      action: () => router.push(`/concept?session=${store.sessionId}`),
                    },
                    {
                      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />,
                      label: "Dashboard",
                      sub: "Roadmap mit Phasen, Tools und Fortschritt.",
                      accent: false,
                      action: () => router.push("/dashboard"),
                    },
                  ].map((c, idx) => (
                    <motion.button
                      key={c.label}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", duration: 0.5, bounce: 0.12, delay: 0.1 + idx * 0.07 }}
                      whileHover={{ y: -3, scale: 1.012, transition: BTN_SPRING }}
                      whileTap={{ scale: 0.975, transition: BTN_SPRING }}
                      onClick={c.action}
                      className={cn(
                        "group/hub relative flex items-center gap-4 rounded-2xl px-5 py-4 border text-left overflow-hidden transition-all duration-200",
                        c.accent
                          ? "border-green-500 shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30"
                          : "bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-800 shadow-sm hover:shadow-md"
                      )}
                      style={c.accent ? { background: "linear-gradient(135deg, #16a34a 0%, #15803d 60%, #14532d 100%)" } : undefined}
                    >
                      {/* Sheen sweep on hover (primary card) */}
                      {c.accent && (
                        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover/hub:translate-x-full transition-transform duration-700 ease-out"
                          style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)" }} />
                      )}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/hub:scale-110 group-hover/hub:rotate-[-4deg]",
                        c.accent
                          ? "bg-white/20 text-white ring-1 ring-white/30"
                          : "bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 ring-1 ring-green-100 dark:ring-green-900"
                      )}>
                        {c.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-semibold text-sm", c.accent ? "text-white" : "text-zinc-900 dark:text-zinc-50")}>
                          {c.label}
                        </p>
                        <p className={cn("text-xs leading-relaxed", c.accent ? "text-green-100" : "text-zinc-500 dark:text-zinc-400")}>
                          {c.sub}
                        </p>
                      </div>
                      {/* Arrow slides in on hover */}
                      <span className={cn(
                        "shrink-0 opacity-0 -translate-x-1 group-hover/hub:opacity-100 group-hover/hub:translate-x-0 transition-all duration-200",
                        c.accent ? "text-white" : "text-green-600"
                      )}>
                        <ArrowUp className="w-4 h-4 rotate-90" strokeWidth={2} />
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : msgs.length === 0 && !store.sending && !startedProject ? (
            <div className="relative flex flex-col items-center justify-center min-h-full px-6 py-16 overflow-hidden">

              {/* Interactive ambient background */}
              <WelcomeBackground />

              <div className="relative w-full max-w-lg text-center">

                {/* Logo wordmark */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.6, bounce: 0.1 }}
                  className="flex items-center justify-center gap-px mb-10"
                >
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50" style={{ letterSpacing: "-0.04em" }}>matfit</span>
                  <span className="text-3xl font-bold text-green-600" style={{ letterSpacing: "-0.04em" }}>.ai</span>
                </motion.div>

                {/* Headline */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.55, bounce: 0.05, delay: 0.08 }}
                >
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-green-600 mb-4">
                    KI-gestützte IT-Beratung
                  </p>
                  <h2
                    className="text-[32px] md:text-[40px] font-extrabold text-zinc-900 dark:text-zinc-50 leading-[1.1] mb-4"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    Lass uns prüfen, welches A.I. Setup<br />
                    am besten deine <RotatingWord />
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed">
                    Transformation Concepts. Roadmaps. IT-Know-how.<br className="hidden sm:block" />
                    Alles auf Basis echter Beratungserfahrung.
                  </p>
                </motion.div>

                {/* Primary action + Schnelle Frage */}
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.06, delay: 0.18 }}
                  whileHover={{ y: -3, transition: BTN_SPRING }}
                  whileTap={{ scale: 0.985, transition: BTN_SPRING }}
                  onClick={startProjectDirect}
                  className="group/start relative w-full max-w-sm mx-auto flex items-center gap-4 rounded-2xl px-5 py-4 overflow-hidden border border-green-500 text-left shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 transition-shadow duration-200"
                  style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 60%, #14532d 100%)" }}
                >
                  {/* Sheen sweep on hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover/start:translate-x-full transition-transform duration-700 ease-out"
                    style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)" }} />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/20 text-white ring-1 ring-white/30 transition-transform duration-200 group-hover/start:scale-110 group-hover/start:rotate-[-4deg]">
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white">Starte Projekt</p>
                    <p className="text-xs leading-relaxed text-green-100">Geführtes Interview → Konzept → Roadmap.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 text-white opacity-70 -translate-x-1 group-hover/start:opacity-100 group-hover/start:translate-x-0 transition-all duration-200" strokeWidth={2} />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.06, delay: 0.24 }}
                  whileTap={{ scale: 0.985, transition: BTN_SPRING }}
                  onClick={() => store.popAssistantGreeting()}
                  className="mt-3 w-full max-w-sm mx-auto flex items-center justify-center gap-2 rounded-2xl px-5 py-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:border-green-300 dark:hover:border-green-800 hover:text-green-700 dark:hover:text-green-400 transition-colors duration-150 text-sm font-medium"
                >
                  <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                  Schnelle Frage — frag den Assistenten
                </motion.button>

                {/* What you get — fills the space and states the value */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.34, duration: 0.4 }}
                  className="mt-8 flex items-center justify-center gap-6 text-zinc-500 dark:text-zinc-400"
                >
                  {[
                    { Icon: Zap, label: "Konzept" },
                    { Icon: LayoutDashboard, label: "Roadmap" },
                    { Icon: Wrench, label: "Tooling" },
                  ].map(({ Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-green-600" strokeWidth={1.5} />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Trust / compliance strip */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-zinc-400 dark:text-zinc-500"
                >
                  {[
                    { Icon: ShieldCheck, label: "DSGVO-konform" },
                    { Icon: Server, label: "Daten in der EU" },
                    { Icon: Lock, label: "Projekt-isoliert" },
                  ].map(({ Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                      {label}
                    </span>
                  ))}
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="px-4 md:px-8 lg:px-12 py-6 space-y-6 w-full max-w-5xl mx-auto">
              {demo && (
                <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  Beispiel — nur zur Ansicht während der Tour. Deine echten Gespräche startest du danach.
                </div>
              )}

              {/* Empty project chat — an inviting prompt instead of a blank screen */}
              {msgs.length === 0 && !demo && !store.sending && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.04 }}
                  className="flex flex-col items-center text-center py-20 max-w-md mx-auto"
                >
                  <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/60 flex items-center justify-center mb-4 ring-1 ring-green-100 dark:ring-green-900">
                    <Sparkles className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1.5" style={{ letterSpacing: "-0.02em" }}>
                    Erzähl mir von deinem Vorhaben
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                    Beschreibe kurz dein Projekt oder deine Herausforderung — ich stelle dir dann die richtigen Fragen, und wir bauen gemeinsam Konzept &amp; Roadmap.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Wir wollen in die Cloud migrieren", "Wir brauchen ein IT-Sicherheitskonzept", "Welches ERP passt zu uns?"].map((ex, i) => (
                      <motion.button
                        key={ex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16 + i * 0.06, type: "spring", duration: 0.4, bounce: 0 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                        className="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-[12.5px] text-zinc-600 dark:text-zinc-300 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50/60 dark:hover:bg-green-950/30 transition-colors duration-150"
                      >
                        {ex}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {msgs.map((m, i) => {
                const isUser = m.role === "user";
                let content = toText(m.content);
                let choices: string[] = [];
                let multi: string[] = [];
                const cm = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
                if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(cm[0], "").trim(); }
                const mm = content.match(/\[\[MULTI:\s*([\s\S]*?)\]\]/i);
                if (mm) { multi = mm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(mm[0], "").trim(); }
                // The agent points to the Concept/Roadmap features instead of
                // writing them out in the chat: [[OPEN:concept]] / [[OPEN:roadmap]].
                let openTarget: "concept" | "roadmap" | null = null;
                const om = content.match(/\[\[OPEN:\s*(concept|roadmap)\s*\]\]/i);
                if (om) { openTarget = om[1].toLowerCase() as "concept" | "roadmap"; content = content.replace(om[0], "").trim(); }
                // Skip empty turns (tool-only / stripped messages) — no empty bubbles.
                if (!content.trim() && choices.length === 0 && multi.length === 0 && !openTarget) return null;
                const isLastAssistant = i === lastAssistantIdx && !store.sending;
                return (
                  <div key={i} className={cn("group/msg flex gap-3 animate-in", isUser && "flex-row-reverse")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: isUser ? "#15803d" : "var(--green)", fontFamily: isUser ? "inherit" : "Georgia,serif" }}>
                      {isUser ? "U" : "A"}
                    </div>
                    <div className={cn("flex flex-col min-w-0", isUser ? "items-end max-w-[78%]" : "items-start flex-1")}>
                      <p className="text-xs text-zinc-400 font-medium mb-1.5">{isUser ? "Du" : "matfit.ai"}</p>
                      <div className={cn(
                        "leading-relaxed",
                        isUser
                          ? "bg-green-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-[13px]"
                          : "bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm text-zinc-800 dark:text-zinc-200 px-5 py-4 rounded-2xl rounded-tl-sm w-full"
                      )}
                        dangerouslySetInnerHTML={{ __html: md(content) }} />
                      {!isUser && <MsgActions text={content} />}
                      {choices.length > 0 && <ChoiceChips choices={choices} onSelect={send} />}
                      {multi.length > 0 && isLastAssistant && <MultiChoiceChips choices={multi} onSubmit={send} />}
                      {openTarget === "concept" && (
                        <button onClick={() => router.push(`/concept?session=${store.sessionId}&gen=1`)}
                          className="group/cta mt-3 relative inline-flex items-center gap-3 overflow-hidden text-sm font-semibold text-white rounded-2xl pl-3 pr-5 py-2.5 shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 active:scale-[0.98] transition-all duration-200"
                          style={{ background: "linear-gradient(140deg, #16a34a 0%, #15803d 60%, #14532d 100%)" }}>
                          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700 ease-out"
                            style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)" }} />
                          <span className="w-8 h-8 rounded-xl bg-white/20 ring-1 ring-white/25 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/cta:scale-105 group-hover/cta:-rotate-[4deg]">
                            <Zap className="w-4 h-4" strokeWidth={1.6} />
                          </span>
                          Transformation Concept erstellen
                          <ArrowRight className="w-4 h-4 opacity-80 -translate-x-0.5 group-hover/cta:translate-x-0.5 transition-transform duration-200" strokeWidth={2} />
                        </button>
                      )}
                      {openTarget === "roadmap" && (
                        <button onClick={() => router.push(`/dashboard?session=${store.sessionId}`)}
                          className="group/cta mt-3 relative inline-flex items-center gap-3 overflow-hidden text-sm font-semibold text-white rounded-2xl pl-3 pr-5 py-2.5 shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 active:scale-[0.98] transition-all duration-200"
                          style={{ background: "linear-gradient(140deg, #16a34a 0%, #15803d 60%, #14532d 100%)" }}>
                          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700 ease-out"
                            style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)" }} />
                          <span className="w-8 h-8 rounded-xl bg-white/20 ring-1 ring-white/25 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/cta:scale-105 group-hover/cta:-rotate-[4deg]">
                            <LayoutDashboard className="w-4 h-4" strokeWidth={1.6} />
                          </span>
                          Roadmap erstellen
                          <ArrowRight className="w-4 h-4 opacity-80 -translate-x-0.5 group-hover/cta:translate-x-0.5 transition-transform duration-200" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {store.sending && (
                <div className="flex gap-3 animate-in">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                    style={{ background: "var(--green)", fontFamily: "Georgia,serif" }}>A</div>
                  <div className="flex flex-col">
                    <p className="text-xs text-zinc-400 font-medium mb-1.5">matfit.ai</p>
                    <ThinkingBubble phases={allPhases} current={phaseIdx} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer — the left agent's text field. Hidden on the welcome screen;
            revealed once the user clicks "Starte Projekt" (or is in a chat). */}
        {(!onWelcome || startedProject) && (
        <footer className="shrink-0 px-4 md:px-8 lg:px-12 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-5xl mx-auto w-full">
            {/* Research is hidden for now — it becomes its own feature later. */}
            {turns > 0 && (
              <div className="flex items-center justify-end mb-2">
                <Badge variant="secondary">{turns} turns</Badge>
              </div>
            )}
            <div data-tour="composer" className="flex gap-3 items-end bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-green-400 dark:focus-within:border-green-600 focus-within:shadow-sm transition-all duration-150">
              <textarea ref={inputRef} value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 180)}px`; }}
                placeholder="Beschreibe dein Projekt…"
                className="flex-1 bg-transparent border-none resize-none text-sm text-zinc-900 dark:text-zinc-100 outline-none leading-relaxed placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                style={{ minHeight: 26, maxHeight: 180, fontFamily: "inherit" }} />
              <motion.button
                whileTap={canSend ? { scale: 0.92 } : {}}
                transition={BTN_SPRING}
                onClick={() => send(input)} disabled={!canSend}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150",
                  canSend
                    ? "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-600/30"
                    : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-default"
                )}
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2} />
              </motion.button>
            </div>
            <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 text-center mt-2">
              matfit.ai kann Fehler machen — prüfe wichtige Informationen. Antworten basieren auf deinem Projekt-Kontext.
            </p>
          </div>
        </footer>
        )}
    </AppShell>
  );
}
