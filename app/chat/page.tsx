"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { Sidebar, SidebarHamburger } from "@/components/layout/sidebar";
import { Badge, TabGroup, Tab } from "@/components/ui";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Map, ArrowUp, MessageSquare, CheckCircle2 } from "lucide-react";

// ── Phase lists (long, non-repeating within a response) ──────────────────────
const PHASES_CHAT = [
  "Lese deine Frage…",
  "Verstehe den Kontext…",
  "Analysiere relevante Aspekte…",
  "Denke über Lösungsansätze nach…",
  "Strukturiere die Antwort…",
  "Überprüfe Vollständigkeit…",
  "Formuliere finale Antwort…",
];
const PHASES_RESEARCH = [
  "Lese und verstehe deine Frage…",
  "Identifiziere Kernthemen…",
  "Recherchiere relevante Quellen…",
  "Analysiere Ergebnisse…",
  "Vergleiche Optionen und Ansätze…",
  "Synthetisiere Erkenntnisse…",
  "Formuliere Empfehlungen…",
  "Überprüfe Vollständigkeit…",
];

const BTN_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

// ── Markdown renderer ─────────────────────────────────────────────────────────
function inlineFmt(t: string): string {
  return t
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-700 px-1 py-0.5 rounded text-[11.5px] font-mono text-zinc-800 dark:text-zinc-200">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em class='opacity-80'>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-600 underline underline-offset-2 hover:text-green-700" target="_blank" rel="noopener noreferrer">$1</a>');
}

function renderTable(rows: string[]): string {
  const isSep = (r: string) => /^\|[\s|:-]+\|$/.test(r.trim());
  const parseRow = (r: string) =>
    r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  const dataRows = rows.filter(r => !isSep(r) && r.trim());
  if (!dataRows.length) return "";
  const [head, ...body] = dataRows;
  const ths = parseRow(head).map(h =>
    `<th class="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">${inlineFmt(h)}</th>`
  ).join("");
  const trs = body.map(r => {
    const tds = parseRow(r).map(c =>
      `<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 border-t border-zinc-100 dark:border-zinc-700">${inlineFmt(c)}</td>`
    ).join("");
    return `<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">${tds}</tr>`;
  }).join("");
  return `<div class="overflow-x-auto my-3 rounded-lg border border-zinc-200 dark:border-zinc-700"><table class="w-full"><thead class="bg-zinc-50 dark:bg-zinc-800/60"><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

function md(raw: string): string {
  // Normalize line endings (API may return \r\n)
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code block (``` or ```lang)
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const escaped = codeLines.join("\n")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      out.push(
        `<pre class="bg-zinc-950 dark:bg-zinc-950 text-zinc-100 rounded-xl p-4 overflow-x-auto my-4 text-[12.5px] font-mono leading-relaxed border border-zinc-800"><code>${escaped}</code></pre>`
      );
      continue;
    }

    // Table
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    // Headings — match on trimmed, use trimmed for text
    const hm = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (hm) {
      const lvl = hm[1].length;
      const txt = inlineFmt(hm[2].trim());
      const cls = [
        "text-[18px] font-bold text-zinc-900 dark:text-zinc-50 mt-6 mb-2 leading-tight",
        "text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 mt-5 mb-2 leading-tight",
        "text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 mt-4 mb-1.5 uppercase tracking-wide",
        "text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 mt-3 mb-1",
      ][lvl - 1] ?? "text-sm font-semibold mt-2 mb-1";
      out.push(`<h${lvl} class="${cls}">${txt}</h${lvl}>`);
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      out.push('<hr class="border-zinc-200 dark:border-zinc-700 my-5" />');
      i++; continue;
    }

    // Unordered list
    if (/^[-*•]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        items.push(`<li class="leading-relaxed">${inlineFmt(lines[i].trim().replace(/^[-*•]\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="my-2.5 ml-5 list-disc space-y-1 text-[13px] text-zinc-700 dark:text-zinc-300">${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(`<li class="leading-relaxed">${inlineFmt(lines[i].trim().replace(/^\d+\.\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ol class="my-2.5 ml-5 list-decimal space-y-1 text-[13px] text-zinc-700 dark:text-zinc-300">${items.join("")}</ol>`);
      continue;
    }

    // Empty line → spacer
    if (!trimmed) {
      out.push('<div class="h-2"></div>');
      i++; continue;
    }

    // Normal paragraph
    out.push(`<p class="leading-relaxed text-[13.5px] text-zinc-800 dark:text-zinc-200">${inlineFmt(trimmed)}</p>`);
    i++;
  }

  return out.join("");
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
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {choices.map(c => (
          <button key={c} disabled={!!picked} onClick={() => { setPicked(c); onSelect(c); }}
            className={cn("choice-chip", picked === c && "chosen")}>{c}</button>
        ))}
      </div>
      <p className="text-xs text-zinc-400">Wähle oder schreib deine eigene Antwort.</p>
    </div>
  );
}

function Btn({ children, onClick, className, disabled }: {
  children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  return (
    <motion.button whileHover={disabled ? {} : { y: -1 }} whileTap={disabled ? {} : { scale: 0.97 }}
      transition={BTN_SPRING} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </motion.button>
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

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [store.messages, store.sending]);

  const allPhases = store.mode === "research" ? PHASES_RESEARCH : PHASES_CHAT;

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
      if (store.guidedProject) store.setGuidedProject(false);
      api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
    } catch (e: unknown) {
      store.addMessage({ role: "assistant", content: `**Fehler:** ${(e as Error).message}` });
    } finally { stopThinking(); }
  }

  const turns = store.messages.filter(m => m.role === "user").length;
  const canSend = !!input.trim() && !store.sending;

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="flex bg-zinc-50 dark:bg-zinc-950" style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar currentPath="/chat" />

      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 min-w-0" style={{ overflow: "hidden" }}>

        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          <SidebarHamburger />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">{store.sessionTitle}</p>
          </div>
          {store.guidedProject && <Badge variant="default" className="hidden sm:inline-flex">Geführter Modus</Badge>}
          <Btn
            onClick={() => router.push(`/concept?session=${store.sessionId}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 rounded-lg px-3 md:px-3.5 py-2 shadow-sm shadow-green-600/20"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Concept</span>
          </Btn>
          <Btn
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 rounded-lg px-3 md:px-3.5 py-2"
          >
            <Map className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Roadmap</span>
          </Btn>
        </header>

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {store.messages.length === 0 && !store.sending ? (
            <div className="relative flex flex-col items-center justify-center min-h-full px-6 py-16 overflow-hidden">

              {/* Ambient background glow */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.06, 0.11, 0.06] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="w-[600px] h-[400px] rounded-full"
                  style={{ background: "radial-gradient(ellipse, #16a34a, transparent 70%)" }}
                />
              </div>

              <div className="relative w-full max-w-lg text-center">

                {/* Logo wordmark */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.6, bounce: 0.1 }}
                  className="flex items-center justify-center gap-2.5 mb-10"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-green-600/25"
                    style={{ background: "var(--green)", fontFamily: "Georgia, serif" }}
                  >B</div>
                  <span
                    className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
                    style={{ letterSpacing: "-0.04em", fontFamily: "inherit" }}
                  >matfit.ai</span>
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
                    Was möchtest du<br />
                    <span className="text-green-600">heute lösen?</span>
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed">
                    Transformation Concepts. Roadmaps. IT-Know-how.<br className="hidden sm:block" />
                    Alles auf Basis echter Beratungserfahrung.
                  </p>
                </motion.div>

                {/* Action cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
                  {([
                    {
                      icon: <MessageSquare className="w-4 h-4" strokeWidth={1.5} />,
                      label: "Chat starten",
                      sub: "Frag alles — IT-Architektur, Tools, Strategie.",
                      cta: "Frage stellen →",
                      accent: false,
                      action: () => inputRef.current?.focus(),
                    },
                    {
                      icon: <Zap className="w-4 h-4" strokeWidth={1.5} />,
                      label: "Projekt starten",
                      sub: "Geführtes Interview → Concept → Roadmap.",
                      cta: "Jetzt starten →",
                      accent: true,
                      action: () => { store.setGuidedProject(true); inputRef.current?.focus(); },
                    },
                  ] as const).map((c, idx) => (
                    <motion.div
                      key={c.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", duration: 0.5, bounce: 0.06, delay: 0.18 + idx * 0.07 }}
                      whileHover={{ y: -3, transition: BTN_SPRING }}
                      whileTap={{ scale: 0.975, transition: BTN_SPRING }}
                      onClick={c.action}
                      className={cn(
                        "relative cursor-pointer rounded-2xl p-5 overflow-hidden border transition-shadow duration-200 hover:shadow-lg",
                        c.accent
                          ? "bg-green-600 border-green-500 hover:shadow-green-500/20"
                          : "bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-zinc-200/60 dark:hover:shadow-black/20"
                      )}
                    >
                      {c.accent && (
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ background: "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(255,255,255,0.12), transparent)" }} />
                      )}
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-4",
                        c.accent ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400")}>
                        {c.icon}
                      </div>
                      <p className={cn("font-semibold text-sm mb-1.5", c.accent ? "text-white" : "text-zinc-900 dark:text-zinc-50")}>
                        {c.label}
                      </p>
                      <p className={cn("text-xs leading-relaxed mb-4", c.accent ? "text-green-100" : "text-zinc-500 dark:text-zinc-400")}>
                        {c.sub}
                      </p>
                      <span className={cn("text-xs font-semibold", c.accent ? "text-white/80" : "text-green-600")}>
                        {c.cta}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Topic chips */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.38, duration: 0.4 }}
                  className="flex flex-wrap gap-2 justify-center"
                >
                  <span className="text-xs text-zinc-400 self-center mr-1">Probier:</span>
                  {["Cloud Migration", "Make.com vs Zapier", "IT-Sicherheitsaudit", "ERP-Auswahl", "DevOps einführen"].map(p => (
                    <Btn key={p}
                      onClick={() => { setInput(p); inputRef.current?.focus(); }}
                      className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[12px] text-zinc-600 dark:text-zinc-400 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50/60 dark:hover:bg-green-950/30 transition-colors duration-150"
                    >{p}</Btn>
                  ))}
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="px-4 md:px-8 lg:px-12 py-6 space-y-6 w-full max-w-5xl mx-auto">
              {store.messages.map((m, i) => {
                const isUser = m.role === "user";
                let content = toText(m.content);
                let choices: string[] = [];
                const cm = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
                if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(cm[0], "").trim(); }
                return (
                  <div key={i} className={cn("flex gap-3 animate-in", isUser && "flex-row-reverse")}>
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
                      {choices.length > 0 && <ChoiceChips choices={choices} onSelect={send} />}
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

        {/* Composer */}
        <footer className="shrink-0 px-4 md:px-8 lg:px-12 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-2">
              <TabGroup>
                <Tab active={store.mode === "chat"} onClick={() => store.setMode("chat")}>Chat</Tab>
                <Tab active={store.mode === "research"} onClick={() => store.setMode("research")}>Research</Tab>
              </TabGroup>
              <span className="flex-1" />
              {turns > 0 && <Badge variant="secondary">{turns} turns</Badge>}
            </div>
            <div className="flex gap-3 items-end bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-green-400 dark:focus-within:border-green-600 focus-within:shadow-sm transition-all duration-150">
              <textarea ref={inputRef} value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 180)}px`; }}
                placeholder="Ask anything… (Enter to send)"
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
          </div>
        </footer>
      </div>
    </div>
  );
}
