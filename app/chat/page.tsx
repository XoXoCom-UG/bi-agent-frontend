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
    .replace(/^### (.+)$/gm, "<h4 style='font-size:13px;font-weight:600;margin:10px 0 4px;color:#0f1410'>$1</h4>")
    .replace(/^## (.+)$/gm, "<h4 style='font-size:13px;font-weight:600;margin:10px 0 4px;color:#0f1410'>$1</h4>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => `<ul style='margin:8px 0 8px 18px'>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hupl\/])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

function ChoiceChips({ choices, onSelect }: { choices: string[]; onSelect: (c: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {choices.map(c => (
          <button key={c} disabled={!!picked} onClick={() => { setPicked(c); onSelect(c); }}
            className={`choice-chip${picked === c ? " chosen" : ""}`}>{c}</button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>Wähle eine Option oder schreib unten deine eigene Antwort.</p>
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
  const showWelcome = store.messages.length === 0 && !store.sending;

  if (loading || !token) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div className="thinking-spinner" style={{ width: 24, height: 24 }} />
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar currentPath="/chat" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 52, background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 2, background: "var(--bg)", padding: 3, borderRadius: 9, border: "1px solid var(--border)" }}>
            {[{ l: "Konversation", p: "/chat" }, { l: "Dashboard", p: "/dashboard" }].map(v => (
              <button key={v.p} onClick={() => router.push(v.p)}
                style={{ padding: "5px 13px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: v.p === "/chat" ? "#fff" : "transparent", color: v.p === "/chat" ? "var(--text)" : "var(--text-3)", boxShadow: v.p === "/chat" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                {v.l}
              </button>
            ))}
          </div>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.sessionTitle}</span>
          {turnCount > 0 && (
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-3)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 9px" }}>{turnCount} turns</span>
          )}
          <button onClick={() => router.push(`/concept?session=${store.sessionId}`)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "var(--text-2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green-dark)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}>
            ⚡ Transformation Concept
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {showWelcome ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: "48px 32px" }}>
              <div style={{ maxWidth: 600, width: "100%", textAlign: "center" }}>
                {/* Logo mark */}
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--green)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "Georgia,serif", fontWeight: 700, color: "#fff", boxShadow: "0 4px 20px rgba(61,139,0,0.25)" }}>B</div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--green)", marginBottom: 10 }}>IT Consulting Agent</div>
                <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", marginBottom: 10, lineHeight: 1.15 }}>Was möchtest du <em style={{ fontStyle: "italic", fontFamily: "Georgia,serif", fontWeight: 400 }}>heute</em> lösen?</h2>
                <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 36 }}>Stell eine Frage oder starte ein geführtes Projekt.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                  {[
                    { icon: "💬", title: "Chat starten", desc: "Direkter Zugang zur IT-Wissensbasis. Frag alles.", action: () => inputRef.current?.focus(), color: "var(--border)" },
                    { icon: "⚡", title: "Projekt starten", desc: "Geführtes Interview → Transformation Concept → Roadmap.", action: () => { store.setGuidedProject(true); inputRef.current?.focus(); }, color: "var(--green-mid)" },
                  ].map(c => (
                    <button key={c.title} onClick={c.action}
                      style={{ padding: "22px 20px", background: "#fff", border: `1px solid ${c.color}`, borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--text)", transition: "all 0.2s", position: "relative" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(61,139,0,0.12)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = c.color; (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
                      <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5, color: "var(--text)" }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{c.desc}</div>
                      <span style={{ position: "absolute", top: 16, right: 16, color: "var(--text-3)", fontSize: 16 }}>→</span>
                    </button>
                  ))}
                </div>
                {/* Quick prompts */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {["Cloud Migration strategie", "Make.com vs Zapier?", "IT-Sicherheitskonzept", "ERP-Auswahl Mittelstand"].map(p => (
                    <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                      style={{ padding: "6px 13px", borderRadius: 20, border: "1px solid var(--border)", background: "#fff", fontSize: 12, color: "var(--text-2)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green-dark)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px" }}>
              {store.messages.map((m, i) => {
                const isUser = m.role === "user";
                let content = m.content;
                let choices: string[] = [];
                const cm = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
                if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(cm[0], "").trim(); }
                return (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 24, flexDirection: isUser ? "row-reverse" : "row" }}>
                    {/* Avatar */}
                    <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, ...(isUser ? { background: "var(--text)", color: "#fff" } : { background: "var(--green)", color: "#fff", fontFamily: "Georgia,serif" }) }}>
                      {isUser ? "U" : "A"}
                    </div>
                    <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 5, fontWeight: 500 }}>{isUser ? "Du" : "BI Agent"}</span>
                      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", ...(isUser ? { background: "var(--text)", color: "#fff", padding: "10px 16px", borderRadius: "14px 14px 4px 14px" } : { background: "#fff", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "4px 14px 14px 14px" }) }}>
                        <div className="prose-chat" dangerouslySetInnerHTML={{ __html: md(content) }} />
                      </div>
                      {choices.length > 0 && <ChoiceChips choices={choices} onSelect={send} />}
                    </div>
                  </div>
                );
              })}
              {store.sending && (
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: "Georgia,serif", flexShrink: 0, marginTop: 2 }}>A</div>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 5, fontWeight: 500 }}>BI Agent</span>
                    <div style={{ background: "#fff", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "4px 14px 14px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="thinking-spinner" />
                      <span style={{ fontSize: 13, color: "var(--text-3)", fontStyle: "italic" }}>{phases[phaseIdx]}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: "12px 24px 18px", borderTop: "1px solid var(--border)", background: "#fff", flexShrink: 0 }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 2, background: "var(--bg)", padding: "3px", borderRadius: 8, border: "1px solid var(--border)" }}>
                {(["chat", "research"] as const).map(mode => (
                  <button key={mode} onClick={() => store.setMode(mode)}
                    style={{ padding: "4px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: store.mode === mode ? "#fff" : "transparent", color: store.mode === mode ? "var(--text)" : "var(--text-3)", boxShadow: store.mode === mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                    {mode === "chat" ? "Chat" : "Research"}
                  </button>
                ))}
              </div>
              {store.guidedProject && (
                <span style={{ fontSize: 11, color: "var(--green)", background: "var(--green-light)", border: "1px solid var(--green-mid)", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>⚡ Geführter Modus</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#fff", border: "1px solid var(--border-2)", borderRadius: 14, padding: "10px 12px", transition: "border-color 0.2s, box-shadow 0.2s" }}
              onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(61,139,0,0.08)"; }}
              onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-2)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
              <textarea ref={inputRef} value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 180)}px`; }}
                placeholder={store.guidedProject ? "Beschreibe dein Projekt…" : "Ask anything… (Enter to send)"}
                style={{ flex: 1, background: "transparent", border: "none", resize: "none", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none", minHeight: 26, maxHeight: 180, lineHeight: 1.55 }} />
              <button onClick={() => send(input)} disabled={!input.trim() || store.sending}
                style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: input.trim() && !store.sending ? "var(--green)" : "var(--bg)", color: input.trim() && !store.sending ? "#fff" : "var(--text-3)", cursor: input.trim() && !store.sending ? "pointer" : "default", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
