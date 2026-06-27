"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";

const PHASES = ["Verstehe deine Frage…","Analysiere relevante Aspekte…","Ordne die wichtigsten Punkte…","Formuliere die Antwort…"];
const PHASES_R = ["Recherchiere Quellen…","Analysiere die Ergebnisse…","Vergleiche Optionen…","Formuliere fundierte Antwort…"];

function md(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h4 style='font-size:13px;font-weight:600;margin:10px 0 4px'>$1</h4>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => `<ul style='margin:8px 0 8px 18px'>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hupl\/])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

function ChoiceChips({ choices, onSelect }: { choices: string[]; onSelect: (c: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {choices.map(c => (
          <button key={c} disabled={!!picked} onClick={() => { setPicked(c); onSelect(c); }}
            className={`choice-chip${picked === c ? " chosen" : ""}`}>{c}</button>
        ))}
      </div>
      <p className="text-xs mt-1.5" style={{ color: "var(--color-ink-3)" }}>Wähle eine Option oder schreib unten deine eigene Antwort.</p>
    </div>
  );
}

export default function ChatPage() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const turnCount = store.messages.filter(m => m.role === "user").length;

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [store.messages, store.sending]);

  function startThinking() {
    store.setSending(true); setPhaseIdx(0);
    const p = store.mode === "research" ? PHASES_R : PHASES;
    timerRef.current = setInterval(() => setPhaseIdx(i => (i + 1) % p.length), 1800);
  }
  function stopThinking() {
    store.setSending(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || !token || store.sending) return;
    setInput("");
    const userMsg = { role: "user" as const, content: t };
    const isFirst = store.messages.length === 0;
    store.addMessage(userMsg);
    if (isFirst) store.setSessionTitle(t.slice(0, 55));
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

  const phases = store.mode === "research" ? PHASES_R : PHASES;

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-canvas)" }}>
      <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh", background: "var(--color-canvas)" }}>
      <Sidebar currentPath="/chat" />

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-5 border-b flex-shrink-0" style={{ height: 52, borderColor: "var(--color-line)" }}>
          <div className="flex gap-0.5 p-0.5 rounded-lg border" style={{ background: "var(--color-canvas)", borderColor: "var(--color-line)" }}>
            {[{ l: "Konversation", p: "/chat" }, { l: "Dashboard", p: "/dashboard" }].map(v => (
              <button key={v.p} onClick={() => router.push(v.p)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{ background: v.p === "/chat" ? "white" : "transparent", color: v.p === "/chat" ? "var(--color-ink)" : "var(--color-ink-3)", boxShadow: v.p === "/chat" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                {v.l}
              </button>
            ))}
          </div>
          <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--color-ink-2)" }}>{store.sessionTitle}</span>
          {turnCount > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-line)", color: "var(--color-ink-3)" }}>
              {turnCount} turns
            </span>
          )}
          <button onClick={() => router.push(`/concept?session=${store.sessionId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink-2)", background: "white" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-brand)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-brand-dark)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-line)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-ink-2)"; }}>
            ⚡ Transformation Concept
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {store.messages.length === 0 && !store.sending ? (
            <div className="flex items-center justify-center min-h-full px-8 py-12">
              <div className="max-w-lg w-full text-center animate-in">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-5"
                  style={{ background: "var(--color-brand)", fontFamily: "Georgia, serif", boxShadow: "0 4px 20px rgba(61,139,0,0.2)" }}>B</div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-brand)" }}>IT Consulting Agent</p>
                <h2 className="text-3xl font-extrabold mb-2" style={{ color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
                  Was möchtest du lösen?
                </h2>
                <p className="text-sm mb-8" style={{ color: "var(--color-ink-3)" }}>Stell eine Frage oder starte ein geführtes Projekt.</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: "💬", title: "Chat starten", desc: "Direkter Zugang zur IT-Wissensbasis.", action: () => inputRef.current?.focus() },
                    { icon: "⚡", title: "Projekt starten", desc: "Interview → Transformation Concept → Roadmap.", action: () => { store.setGuidedProject(true); inputRef.current?.focus(); } },
                  ].map(c => (
                    <button key={c.title} onClick={c.action}
                      className="p-5 rounded-2xl border text-left transition-all hover:-translate-y-0.5"
                      style={{ borderColor: "var(--color-line)", background: "var(--color-canvas)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-brand)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(61,139,0,0.1)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-line)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
                      <div className="text-2xl mb-3">{c.icon}</div>
                      <div className="font-bold text-sm mb-1" style={{ color: "var(--color-ink)" }}>{c.title}</div>
                      <div className="text-xs leading-relaxed" style={{ color: "var(--color-ink-3)" }}>{c.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Cloud Migration", "Make.com vs Zapier?", "IT-Sicherheit", "ERP-Auswahl"].map(p => (
                    <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                      className="px-3 py-1.5 rounded-full border text-xs transition-all"
                      style={{ borderColor: "var(--color-line)", color: "var(--color-ink-2)", background: "white" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-brand)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-brand-dark)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-line)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-ink-2)"; }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              {store.messages.map((m, i) => {
                const isUser = m.role === "user";
                let content = m.content;
                let choices: string[] = [];
                const cm = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
                if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(cm[0], "").trim(); }
                return (
                  <div key={i} className={`flex gap-3 animate-in ${isUser ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isUser ? "bg-gray-900 text-white" : "text-white"}`}
                      style={!isUser ? { background: "var(--color-brand)", fontFamily: "Georgia, serif" } : {}}>
                      {isUser ? "U" : "A"}
                    </div>
                    <div className={`max-w-[72%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-3)" }}>{isUser ? "Du" : "BI Agent"}</p>
                      <div className={`text-sm leading-relaxed prose-chat ${isUser ? "text-white rounded-2xl rounded-tr-sm px-4 py-2.5" : "rounded-2xl rounded-tl-sm border px-4 py-3"}`}
                        style={isUser ? { background: "var(--color-ink)" } : { background: "white", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                        dangerouslySetInnerHTML={{ __html: md(content) }} />
                      {choices.length > 0 && <ChoiceChips choices={choices} onSelect={send} />}
                    </div>
                  </div>
                );
              })}
              {store.sending && (
                <div className="flex gap-3 animate-in">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: "var(--color-brand)", fontFamily: "Georgia, serif" }}>A</div>
                  <div>
                    <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--color-ink-3)" }}>BI Agent</p>
                    <div className="flex items-center gap-2.5 border rounded-2xl rounded-tl-sm px-4 py-3 bg-white" style={{ borderColor: "var(--color-line)" }}>
                      <div className="thinking-spinner" />
                      <span className="text-sm italic" style={{ color: "var(--color-ink-3)" }}>{phases[phaseIdx]}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-white" style={{ borderColor: "var(--color-line)" }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex gap-0.5 p-0.5 rounded-lg border" style={{ background: "var(--color-canvas)", borderColor: "var(--color-line)" }}>
                {(["chat", "research"] as const).map(mode => (
                  <button key={mode} onClick={() => store.setMode(mode)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all capitalize"
                    style={{ background: store.mode === mode ? "white" : "transparent", color: store.mode === mode ? "var(--color-ink)" : "var(--color-ink-3)", boxShadow: store.mode === mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                    {mode === "chat" ? "Chat" : "Research"}
                  </button>
                ))}
              </div>
              {store.guidedProject && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: "var(--color-brand-light)", color: "var(--color-brand)", border: "1px solid var(--color-brand-mid)" }}>
                  ⚡ Geführter Modus
                </span>
              )}
            </div>
            <div className="flex gap-3 items-end rounded-2xl border px-4 py-3 transition-all bg-white"
              style={{ borderColor: "var(--color-line-2)" }}
              onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-brand)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(61,139,0,0.08)"; }}
              onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-line-2)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
              <textarea ref={inputRef} value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 180)}px`; }}
                placeholder={store.guidedProject ? "Beschreibe dein Projekt…" : "Ask anything… (Enter to send)"}
                className="flex-1 bg-transparent border-none resize-none text-sm outline-none leading-relaxed"
                style={{ color: "var(--color-ink)", minHeight: 26, maxHeight: 180, fontFamily: "inherit" }} />
              <button onClick={() => send(input)} disabled={!input.trim() || store.sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-all"
                style={{ background: input.trim() && !store.sending ? "var(--color-brand)" : "var(--color-canvas)", color: input.trim() && !store.sending ? "white" : "var(--color-ink-3)", cursor: input.trim() && !store.sending ? "pointer" : "default", border: "none" }}>
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
