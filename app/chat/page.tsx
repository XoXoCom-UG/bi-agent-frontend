"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";

const PHASES_CHAT = ["Verstehe deine Frage…","Analysiere relevante Aspekte…","Ordne die Antwort…","Formuliere die Antwort…"];
const PHASES_RESEARCH = ["Recherchiere Quellen…","Analysiere die Ergebnisse…","Vergleiche Optionen…","Formuliere fundierte Antwort…"];

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h4 style='font-weight:600;margin:10px 0 4px'>$1</h4>")
    .replace(/^## (.+)$/gm, "<h4 style='font-weight:600;margin:10px 0 4px'>$1</h4>")
    .replace(/^- (.+)$/gm, "<li style='margin-left:18px;margin-bottom:3px'>$1</li>")
    .replace(/(<li.*<\/li>\n?)+/g, m => `<ul style='margin:8px 0'>${m}</ul>`)
    .replace(/\n\n/g, "</p><p style='margin-bottom:8px'>")
    .replace(/^(?!<[hupl])(.+)$/gm, "<p style='margin-bottom:8px'>$1</p>")
    .replace(/<p style='margin-bottom:8px'><\/p>/g, "");
}

function ChoiceChips({ choices, onSelect }: { choices: string[]; onSelect: (c: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {choices.map(c => (
          <button key={c} disabled={!!picked} onClick={() => { setPicked(c); onSelect(c); }}
            style={{
              padding: "8px 16px", borderRadius: 12, border: `1px solid ${picked === c ? "transparent" : "var(--border)"}`,
              background: picked === c ? "var(--accent)" : "var(--bg2)", color: picked === c ? "var(--on-accent)" : "var(--text)",
              fontSize: 13, cursor: picked ? "default" : "pointer", fontFamily: "inherit",
              opacity: picked && picked !== c ? 0.4 : 1, fontWeight: picked === c ? 500 : 400,
              transition: "all 0.15s",
            }}>{c}</button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Wähle eine Option oder schreib unten deine eigene Antwort.</p>
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
  const [theme, setTheme] = useState<"dark"|"light">("dark");

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [store.messages, store.sending]);
  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.style.background = theme === "dark" ? "#0a0a0a" : "#fbfcfa";
  }, [theme]);

  function startThinking() {
    store.setSending(true);
    setPhaseIdx(0);
    const phases = store.mode === "research" ? PHASES_RESEARCH : PHASES_CHAT;
    timerRef.current = setInterval(() => setPhaseIdx(i => (i + 1) % phases.length), 1800);
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
      const res = await api.chat(token, {
        messages: [...store.messages, userMsg],
        session_id: store.sessionId,
        project_id: store.activeProjectId,
        guided: store.guidedProject,
      });
      store.setMessages(res.messages);
      store.setSessionId(res.session_id);
      if (store.guidedProject) store.setGuidedProject(false);
      api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
    } catch (e: unknown) {
      store.addMessage({ role: "assistant", content: `**Fehler:** ${(e as Error).message}` });
    } finally { stopThinking(); }
  }

  const phases = store.mode === "research" ? PHASES_RESEARCH : PHASES_CHAT;
  const showWelcome = store.messages.length === 0 && !store.sending;

  if (loading || !token) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div className="thinking-spinner" />
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar onNavigate={(p) => p !== "/chat" && router.push(p)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56, borderBottom: "1px solid var(--border)", background: "var(--bg2)", flexShrink: 0 }}>
          {/* View toggle */}
          <div style={{ display: "flex", gap: 3, background: "var(--panel)", padding: 3, borderRadius: 10 }}>
            {[
              { label: "Konversation", path: "/chat", active: true },
              { label: "Dashboard", path: "/dashboard", active: false },
            ].map(v => (
              <button key={v.path} onClick={() => !v.active && router.push(v.path)}
                style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  background: v.active ? "var(--bg)" : "transparent", color: v.active ? "var(--text)" : "var(--muted)",
                  boxShadow: v.active ? "0 1px 4px rgba(0,0,0,0.2)" : "none" }}>
                {v.label}
              </button>
            ))}
          </div>

          <h1 style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {store.sessionTitle}
          </h1>

          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--text2)", fontSize: 15 }}>
            {theme === "dark" ? "☀" : "🌙"}
          </button>

          {/* TC button */}
          <button onClick={() => router.push(`/dashboard?session=${store.sessionId}&view=concept`)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            ⚡ Transformation Concept
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
          {showWelcome ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: "48px 24px" }}>
              <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
                <p style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent2)", marginBottom: 16 }}>
                  IT Consulting Agent
                </p>
                <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>
                  Was möchtest du <em style={{ fontStyle: "italic", fontFamily: "Georgia,serif", fontWeight: 400 }}>tun?</em>
                </h2>
                <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 40 }}>
                  Wähle, wie du starten willst. Du wirst Schritt für Schritt geführt.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { icon: "💬", title: "Chat starten", desc: "Stell eine konkrete Frage und bekomme eine fundierte, belegte Antwort.", action: () => inputRef.current?.focus() },
                    { icon: "⚡", title: "Projekt starten", desc: "Lass dich durch Fragen führen und erhalte ein Transformation Concept.", action: () => { store.setGuidedProject(true); inputRef.current?.focus(); } },
                  ].map(c => (
                    <button key={c.title} onClick={c.action}
                      style={{ position: "relative", padding: "28px 24px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--text)", transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
                      <span style={{ position: "absolute", top: 20, right: 20, color: "var(--muted)", fontSize: 18 }}>→</span>
                      <div style={{ fontSize: 24, marginBottom: 12 }}>{c.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{c.title}</div>
                      <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.55 }}>{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
              {store.messages.map((m, i) => {
                const isUser = m.role === "user";
                let content = m.content;
                let choices: string[] = [];
                const cm = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
                if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(cm[0], "").trim(); }
                return (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 28, justifyContent: isUser ? "flex-end" : "flex-start" }}>
                    {!isUser && (
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, fontFamily: "Georgia,serif", flexShrink: 0, marginTop: 2 }}>A</div>
                    )}
                    <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{isUser ? "Du" : "BI Agent"}</div>
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", background: isUser ? "var(--panel)" : "transparent", padding: isUser ? "10px 16px" : "0", borderRadius: isUser ? "16px 16px 4px 16px" : 0 }}
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
                      {choices.length > 0 && <ChoiceChips choices={choices} onSelect={send} />}
                    </div>
                    {isUser && (
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--text)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>U</div>
                    )}
                  </div>
                );
              })}
              {store.sending && (
                <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, fontFamily: "Georgia,serif", flexShrink: 0, marginTop: 2 }}>A</div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>BI Agent</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="thinking-spinner" />
                      <span style={{ fontSize: 13, color: "var(--text2)", fontStyle: "italic" }}>{phases[phaseIdx]}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--border)", background: "var(--bg2)", flexShrink: 0 }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 2, background: "var(--panel)", padding: 3, borderRadius: 8 }}>
                {(["chat","research"] as const).map(m => (
                  <button key={m} onClick={() => store.setMode(m)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      background: store.mode === m ? "var(--bg)" : "transparent", color: store.mode === m ? "var(--text)" : "var(--muted)" }}>
                    {m === "chat" ? "Chat" : "Research"}
                  </button>
                ))}
              </div>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                {store.messages.filter(m => m.role === "user").length} turns
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 14px", transition: "border-color 0.2s" }}
              onFocus={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"}
              onBlur={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
              <textarea ref={inputRef} value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }}
                placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
                style={{ flex: 1, background: "transparent", border: "none", resize: "none", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none", minHeight: 26, maxHeight: 200, lineHeight: 1.55 }} />
              <button onClick={() => send(input)} disabled={!input.trim() || store.sending}
                style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--on-accent)", cursor: input.trim() && !store.sending ? "pointer" : "default", opacity: input.trim() && !store.sending ? 1 : 0.4, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "opacity 0.15s" }}>
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
