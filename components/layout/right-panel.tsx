"use client";
import { useEffect, useRef, useState } from "react";
import { api, Message } from "@/lib/api";
import { md } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Circle, X, ArrowUp, Sparkles } from "lucide-react";

/*
 * Right-side panel per Patryk's feedback (2026-07-01):
 * - top: the workflow status (where the user is in the process, with checkmarks)
 * - below: an interactive help chat that opens when the user wants to discuss
 *   something (selected text, a roadmap tool, a concept row) with the agent.
 */

export interface WorkflowStep {
  label: string;
  detail?: string;
  done: boolean;
}

export function WorkflowStatus({ steps }: { steps: WorkflowStep[] }) {
  const currentIdx = steps.findIndex(s => !s.done);
  return (
    <div className="px-4 py-4">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
        Dein Prozess
      </p>
      <div className="space-y-0">
        {steps.map((s, i) => {
          const isCurrent = i === currentIdx;
          const isLast = i === steps.length - 1;
          return (
            <div key={s.label} className="flex gap-2.5">
              {/* Icon + connector line */}
              <div className="flex flex-col items-center">
                {s.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" strokeWidth={2} />
                ) : isCurrent ? (
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse block" />
                  </span>
                ) : (
                  <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" strokeWidth={1.5} />
                )}
                {!isLast && (
                  <span className={cn(
                    "w-px flex-1 min-h-[14px] my-0.5",
                    s.done ? "bg-green-300 dark:bg-green-800" : "bg-zinc-200 dark:bg-zinc-700"
                  )} />
                )}
              </div>
              <div className="pb-3 min-w-0">
                <p className={cn(
                  "text-xs leading-tight",
                  s.done ? "text-zinc-400 dark:text-zinc-500"
                    : isCurrent ? "font-semibold text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400"
                )}>
                  {s.label}
                </p>
                {s.detail && isCurrent && (
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{s.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Help chat ─────────────────────────────────────────────────────────────────

function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((b: unknown) =>
      b && typeof b === "object" && "text" in b && typeof (b as { text: unknown }).text === "string"
        ? (b as { text: string }).text : ""
    ).join("");
  return "";
}

export interface HelpContext {
  /** The text the user selected / the tool or row they want to discuss */
  quote: string;
  /** Optional lead-in, e.g. "Alternativen zu Maven Wrapper" */
  question?: string;
}

export function HelpChat({ token, projectId, context, onClose }: {
  token: string;
  projectId: string | null;
  context: HelpContext | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionRef = useRef(`help-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentContext = useRef<string | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  // A new context (new selection / new tool) auto-asks its question.
  useEffect(() => {
    if (!context || sentContext.current === context.quote + (context.question || "")) return;
    sentContext.current = context.quote + (context.question || "");
    const q = context.question
      ? `${context.question}\n\n> ${context.quote}`
      : `Erkläre mir das genauer und nenne mögliche Alternativen:\n\n> ${context.quote}`;
    send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || sending) return;
    setInput("");
    const userMsg: Message = { role: "user", content: t };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);
    try {
      const res = await api.chat(token, {
        messages: next,
        session_id: sessionRef.current,
        project_id: projectId,
      });
      setMessages(res.messages);
    } catch (e: unknown) {
      setMessages([...next, { role: "assistant", content: `**Fehler:** ${(e as Error).message}` }]);
    } finally { setSending(false); }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 border-t border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-green-500" strokeWidth={1.5} />
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex-1">Mit dem Agenten diskutieren</p>
        <button onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-3">
        {messages.length === 0 && !sending && (
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Frag nach Alternativen, Vor- und Nachteilen oder Details — der Agent
            antwortet hier, ohne deinen Hauptchat zu unterbrechen.
          </p>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          let text = toText(m.content);
          if (!text.trim()) return null;
          // The agent may offer quick choices — render them as tappable chips.
          let choices: string[] = [];
          const cm = text.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
          if (cm) {
            choices = cm[1].split("|").map(s => s.trim()).filter(Boolean);
            text = text.replace(cm[0], "").trim();
          }
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
        })}
        {sending && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Agent denkt nach…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 pb-3 shrink-0">
        <div className="flex gap-2 items-end bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus-within:border-green-400 dark:focus-within:border-green-600 transition-colors">
          <textarea value={input} rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Nachfrage stellen…"
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

// ── Panel shell ───────────────────────────────────────────────────────────────

export function RightPanel({ open, children, width = 300 }: {
  open: boolean;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0 }}
          className="hidden lg:flex flex-col shrink-0 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
          style={{ height: "100%" }}
        >
          <div className="flex flex-col h-full" style={{ width }}>
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
