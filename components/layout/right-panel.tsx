"use client";
import { useEffect, useRef, useState } from "react";
import { api, Message } from "@/lib/api";
import { md } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { useChatStore, AssistantContext } from "@/lib/chat-store";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowUp, Sparkles, Pencil, MessageCircle, HelpCircle, MousePointerClick } from "lucide-react";

/*
 * Persönlicher Assistent — the right-side panel, present on every screen
 * (Patryk sketch, 2026-07-07). It is ALWAYS a live chat: the user can ask
 * anything at any time. Selecting text / discussing a roadmap tool just
 * pre-fills a question into this same chat — it is an extra convenience, not
 * a precondition.
 */

const CAPABILITIES = [
  { Icon: Pencil, text: "Bearbeite Transformationen" },
  { Icon: MessageCircle, text: "Diskutiere Lösungswege" },
  { Icon: HelpCircle, text: "Stelle Fragen bei Unklarheiten" },
  { Icon: MousePointerClick, text: "Markiere jeglichen Text, um mit mir zu diskutieren" },
];

function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((b: unknown) =>
      b && typeof b === "object" && "text" in b && typeof (b as { text: unknown }).text === "string"
        ? (b as { text: string }).text : ""
    ).join("");
  return "";
}

/** The always-on assistant chat. Reads the shared discuss-context from the
 *  store so any page can push a selection into it. */
export function AssistantPanel({ token, projectId }: { token: string | null; projectId: string | null }) {
  const context = useChatStore(s => s.assistantContext);
  const contextNonce = useChatStore(s => s.assistantContextNonce);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionRef = useRef(`help-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastNonce = useRef(0);

  // Keep the panel scrolled to the newest message (only scrolls the panel,
  // never the main page).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // A freshly pushed context (selection / discuss button) auto-asks its question.
  useEffect(() => {
    if (!context || contextNonce === lastNonce.current) return;
    lastNonce.current = contextNonce;
    const q = context.question
      ? `${context.question}\n\n> ${context.quote}`
      : `Erkläre mir das genauer und nenne mögliche Alternativen:\n\n> ${context.quote}`;
    send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextNonce]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || sending || !token) return;
    setInput("");
    const userMsg: Message = { role: "user", content: t };
    const shown = [...messages, userMsg];
    setMessages(shown);
    setSending(true);
    try {
      // Give the assistant the context of what the user currently sees on the
      // left (chat / concept / roadmap) — as a hidden seed, not shown here.
      const leftCtx = useChatStore.getState().leftContext;
      const seed: Message[] = leftCtx
        ? [
            { role: "user", content: `[Kontext, den der Nutzer gerade links sieht — nur zur Orientierung, nicht wiederholen]\n\n${leftCtx}` },
            { role: "assistant", content: "Alles klar, ich habe den Kontext im Blick." },
          ]
        : [];
      const res = await api.chat(token, { messages: [...seed, ...shown], session_id: sessionRef.current, project_id: projectId });
      const reply = res.messages[res.messages.length - 1];
      setMessages(reply ? [...shown, reply] : shown);
    } catch (e: unknown) {
      setMessages([...shown, { role: "assistant", content: `**Fehler:** ${(e as Error).message}` }]);
    } finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-6 h-6 rounded-lg bg-green-50 dark:bg-green-950/60 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-green-600" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex-1">Persönlicher Assistent</p>
      </div>

      {/* Conversation (or intro + capabilities when empty) */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && !sending ? (
          <div>
            <ul className="space-y-2.5 mb-5">
              {CAPABILITIES.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-[12.5px] text-zinc-600 dark:text-zinc-300 leading-snug">
                  <Icon className="w-4 h-4 text-green-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                  {text}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Frag mich jederzeit etwas — ich antworte hier, ohne deinen Hauptchat zu unterbrechen.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === "user";
            let text = toText(m.content);
            if (!text.trim()) return null;
            let choices: string[] = [];
            const cm = text.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
            if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); text = text.replace(cm[0], "").trim(); }
            const isLast = i === messages.length - 1;
            return (
              <div key={i}>
                {isUser ? (
                  <div className="text-[12px] leading-relaxed whitespace-pre-wrap rounded-xl px-3 py-2 bg-green-600 text-white ml-6">
                    {text}
                  </div>
                ) : (
                  <div
                    className="help-md text-[12px] leading-relaxed rounded-xl px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 mr-2 border border-zinc-100 dark:border-zinc-700 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: md(text) }}
                  />
                )}
                {!isUser && isLast && choices.length > 0 && !sending && (
                  <div className="flex flex-wrap gap-1.5 mt-2 mr-2">
                    {choices.map(c => (
                      <button key={c} onClick={() => send(c)}
                        className="px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800 bg-white dark:bg-zinc-900 text-[11px] text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:border-green-400 transition-colors duration-150">
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        {sending && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Agent denkt nach…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer — always available */}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <div className="flex gap-2 items-end bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus-within:border-green-400 dark:focus-within:border-green-600 transition-colors">
          <textarea value={input} rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask anything… (Enter to send)"
            className="flex-1 bg-transparent border-none resize-none text-xs text-zinc-900 dark:text-zinc-100 outline-none leading-relaxed placeholder:text-zinc-400 min-w-0"
            style={{ minHeight: 20, maxHeight: 100 }} />
          <button onClick={() => send(input)} disabled={!input.trim() || sending}
            className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              input.trim() && !sending
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-default")}>
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel shell: persistent column on desktop, slide-in drawer on mobile ──────

const MIN_W = 280;
const MAX_W = 560;
const DEFAULT_W = 320;

export function AssistantDock({ token, projectId }: { token: string | null; projectId: string | null }) {
  const openMobile = useChatStore(s => s.assistantOpenMobile);
  const setOpenMobile = useChatStore(s => s.setAssistantOpenMobile);

  const [width, setWidth] = useState(DEFAULT_W);
  const widthRef = useRef(DEFAULT_W);
  const dragging = useRef(false);

  const apply = (w: number) => { widthRef.current = w; setWidth(w); };

  useEffect(() => {
    const saved = Number(localStorage.getItem("matfit_assistant_w"));
    if (saved >= MIN_W && saved <= MAX_W) apply(saved);
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      // Panel sits on the right edge — width grows as the cursor moves left.
      apply(Math.min(MAX_W, Math.max(MIN_W, window.innerWidth - e.clientX)));
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("matfit_assistant_w", String(widthRef.current));
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <>
      {/* Desktop: always-present, resizable column */}
      <aside className="no-print relative hidden lg:flex flex-col shrink-0 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-full"
        style={{ width }}>
        {/* Drag handle on the left edge */}
        <div onMouseDown={startDrag}
          title="Ziehen zum Anpassen"
          className="group absolute left-0 top-0 h-full w-2 -translate-x-1/2 cursor-col-resize z-20 flex items-center justify-center">
          <div className="h-12 w-1 rounded-full bg-zinc-200 dark:bg-zinc-700 group-hover:bg-green-500 transition-colors duration-150" />
        </div>
        <AssistantPanel token={token} projectId={projectId} />
      </aside>

      {/* Mobile: slide-in drawer (opened from the topbar assistant button) */}
      <AnimatePresence>
        {openMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setOpenMobile(false)}
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="lg:hidden fixed inset-y-0 right-0 z-50 w-[86%] max-w-[360px] bg-white dark:bg-zinc-900 border-l border-zinc-100 dark:border-zinc-800 flex flex-col"
            >
              <div className="flex items-center justify-end px-2 py-2 shrink-0">
                <button onClick={() => setOpenMobile(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <AssistantPanel token={token} projectId={projectId} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Re-exported for callers that still reference the context type.
export type { AssistantContext };
