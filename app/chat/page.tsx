"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatMessage, ThinkingMessage } from "@/components/chat/message";
import { useTheme } from "next-themes";
import { Sun, Moon, LayoutGrid, MessageSquare, Zap, Send, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter as useNav } from "next/navigation";

const THINKING_PHASES_CHAT = [
  "Verstehe deine Frage…",
  "Analysiere relevante Aspekte…",
  "Ordne die Antwort…",
  "Formuliere die Antwort…",
];
const THINKING_PHASES_RESEARCH = [
  "Recherchiere Quellen…",
  "Analysiere die Ergebnisse…",
  "Vergleiche Optionen…",
  "Formuliere fundierte Antwort…",
];

export default function ChatPage() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const nav = useNav();
  const { theme, setTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [thinkingPhaseIdx, setThinkingPhaseIdx] = useState(0);
  const thinkingTimer = useRef<NodeJS.Timeout | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [token, loading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.messages, store.sending]);

  useEffect(() => {
    setShowWelcome(store.messages.length === 0);
  }, [store.messages]);

  function startThinking() {
    const phases = store.mode === "research" ? THINKING_PHASES_RESEARCH : THINKING_PHASES_CHAT;
    setThinkingPhaseIdx(0);
    store.setSending(true);
    thinkingTimer.current = setInterval(() => {
      setThinkingPhaseIdx(i => (i + 1) % phases.length);
    }, 1800);
  }

  function stopThinking() {
    store.setSending(false);
    if (thinkingTimer.current) { clearInterval(thinkingTimer.current); thinkingTimer.current = null; }
  }

  async function sendMessage(text: string, isGuided = false) {
    const t = text.trim();
    if (!t || !token || store.sending) return;
    setInput("");

    const userMsg = { role: "user" as const, content: t };
    store.addMessage(userMsg);

    if (store.messages.length === 0) {
      store.setSessionTitle(t.slice(0, 60));
    }

    startThinking();
    const newMsgs = [...store.messages, userMsg];

    try {
      const res = await api.chat(token, {
        messages: newMsgs,
        session_id: store.sessionId,
        project_id: store.activeProjectId,
        guided: isGuided && store.guidedProject,
      });
      store.setMessages(res.messages);
      store.setSessionId(res.session_id);
      if (store.guidedProject) store.setGuidedProject(false);
      // Refresh history
      api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
    } catch (e: unknown) {
      store.addMessage({ role: "assistant", content: `**Fehler:** ${(e as Error).message}` });
    } finally {
      stopThinking();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function startChat() {
    setShowWelcome(false);
    inputRef.current?.focus();
  }

  async function startGuidedProject() {
    store.setGuidedProject(true);
    setShowWelcome(false);
    inputRef.current?.focus();
  }

  function handleChoiceSelect(choice: string) {
    sendMessage(choice);
  }

  const phases = store.mode === "research" ? THINKING_PHASES_RESEARCH : THINKING_PHASES_CHAT;

  if (loading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="thinking-spinner" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          {/* View toggle */}
          <div className="flex gap-0.5 bg-muted p-1 rounded-lg">
            <button
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                "data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm",
                "text-muted-foreground hover:text-foreground"
              )}
              data-active={true}>
              <MessageSquare size={13} />
              Konversation
            </button>
            <button
              onClick={() => nav.push("/dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
              <LayoutDashboard size={13} />
              Dashboard
            </button>
          </div>

          {/* Title */}
          <h1 className="flex-1 text-sm font-medium text-muted-foreground truncate">
            {store.sessionTitle}
          </h1>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {/* Transformation Concept */}
            <button
              onClick={() => nav.push(`/dashboard?session=${store.sessionId}&view=concept`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <Zap size={13} />
              Transformation Concept
            </button>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {showWelcome ? (
            /* Welcome screen */
            <div className="flex items-center justify-center min-h-full px-6 py-12">
              <div className="max-w-2xl w-full space-y-8 text-center">
                <div className="space-y-3">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>
                    IT Consulting Agent
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight">
                    Was möchtest du <em className="font-serif font-normal italic">tun?</em>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Wähle, wie du starten willst. Du wirst Schritt für Schritt geführt.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Chat starten */}
                  <button onClick={startChat}
                    className="group relative p-6 bg-card border border-border rounded-2xl text-left transition-all hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg">
                    <span className="absolute top-4 right-4 text-muted-foreground group-hover:text-[var(--accent)] transition-colors text-lg">→</span>
                    <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-muted">
                      <MessageSquare size={18} className="text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">Chat starten</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Stell eine konkrete Frage und bekomme eine fundierte Antwort.
                    </p>
                  </button>

                  {/* Projekt starten */}
                  <button onClick={startGuidedProject}
                    className="group relative p-6 bg-card border border-border rounded-2xl text-left transition-all hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg">
                    <span className="absolute top-4 right-4 text-muted-foreground group-hover:text-[var(--accent)] transition-colors text-lg">→</span>
                    <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-muted">
                      <Zap size={18} className="text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1">Projekt starten</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Lass dich führen und erhalte ein Transformation Concept: Ist-Zustand, Ziel und Schritte.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              {store.messages.map((m, i) => (
                <ChatMessage key={i} message={m} onChoiceSelect={handleChoiceSelect} />
              ))}
              {store.sending && (
                <ThinkingMessage phase={phases[thinkingPhaseIdx]} />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-card/50 backdrop-blur-sm">
          {/* Mode toggle */}
          <div className="max-w-3xl mx-auto mb-3 flex items-center gap-2">
            <div className="flex gap-0.5 bg-muted p-1 rounded-lg">
              {(["chat", "research"] as const).map(m => (
                <button key={m} onClick={() => store.setMode(m)}
                  className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all capitalize",
                    store.mode === m
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                  {m === "chat" ? "Chat" : "Research"}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {store.messages.filter(m => m.role === "user").length} turns
            </span>
          </div>

          {/* Input */}
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-card border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-ring transition-all"
              style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown} rows={1}
                className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[26px] max-h-[200px]"
                placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
                }} />
              <button onClick={() => sendMessage(input, store.guidedProject)}
                disabled={!input.trim() || store.sending}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
