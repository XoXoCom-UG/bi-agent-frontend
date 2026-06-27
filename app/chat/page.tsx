"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";

const PHASES = ["Verstehe deine Frage…","Analysiere relevante Aspekte…","Formuliere die Antwort…","Überprüfe die Antwort…"];
const PHASES_R = ["Recherchiere Quellen…","Analysiere Ergebnisse…","Vergleiche Optionen…","Formuliere Antwort…"];

function md(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<div style='font-size:13px;font-weight:600;margin:10px 0 4px'>$1</div>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => `<ul style='margin:8px 0 8px 18px;list-style:disc'>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hudpl\/])(.+)$/gm, "<p>$1</p>")
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
      <p className="text-xs mt-1.5 text-gray-400">Wähle oder schreib deine eigene Antwort.</p>
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

  const phases = store.mode === "research" ? PHASES_R : PHASES;
  const turns = store.messages.filter(m => m.role === "user").length;

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="flex bg-gray-50" style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar currentPath="/chat" />

      {/* Main column */}
      <div className="flex-1 flex flex-col bg-white" style={{ overflow: "hidden" }}>

        {/* Topbar */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-gray-100 shrink-0 bg-white">
          {/* Nav toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => router.push("/chat")}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white text-gray-900 shadow-sm">
              Konversation
            </button>
            <button onClick={() => router.push("/dashboard")}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              Dashboard
            </button>
          </div>

          {/* Title */}
          <span className="flex-1 text-sm text-gray-500 truncate font-medium">{store.sessionTitle}</span>

          {/* Turns */}
          {turns > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-mono">{turns} turns</span>
          )}

          {/* TC button */}
          <button onClick={() => router.push(`/concept?session=${store.sessionId}`)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-green-400 hover:text-green-800 transition-all">
            ⚡ Transformation Concept
          </button>
        </div>

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {store.messages.length === 0 && !store.sending ? (
            /* Welcome */
            <div className="flex items-center justify-center min-h-full px-8 py-12">
              <div className="max-w-lg w-full text-center animate-in">
                {/* Logo */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-5 shadow-lg"
                  style={{ background: "var(--green)", fontFamily: "Georgia,serif" }}>B</div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--green)" }}>IT Consulting Agent</p>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Was möchtest du lösen?</h2>
                <p className="text-sm text-gray-500 mb-8">Stell eine Frage oder starte ein geführtes Projekt.</p>

                {/* Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  {[
                    { icon: "💬", title: "Chat starten", desc: "Direkter Zugang zur IT-Wissensbasis.", action: () => inputRef.current?.focus() },
                    { icon: "⚡", title: "Projekt starten", desc: "Geführtes Interview → Transformation Concept → Roadmap.", action: () => { store.setGuidedProject(true); inputRef.current?.focus(); } },
                  ].map(c => (
                    <button key={c.title} onClick={c.action}
                      className="p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 text-left transition-all hover:-translate-y-0.5 hover:border-green-200 hover:bg-green-50 hover:shadow-md group">
                      <div className="text-2xl mb-3">{c.icon}</div>
                      <div className="font-bold text-sm text-gray-900 mb-1">{c.title}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{c.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Quick prompts */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Cloud Migration", "Make.com vs Zapier?", "IT-Sicherheit", "ERP-Auswahl"].map(p => (
                    <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                      className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-500 hover:border-green-300 hover:text-green-800 hover:bg-green-50 transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              {store.messages.map((m, i) => {
                const isUser = m.role === "user";
                let content = m.content;
                let choices: string[] = [];
                const cm = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
                if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(cm[0], "").trim(); }
                return (
                  <div key={i} className={`flex gap-3 animate-in ${isUser ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white`}
                      style={{ background: isUser ? "#111827" : "var(--green)", fontFamily: isUser ? "inherit" : "Georgia,serif" }}>
                      {isUser ? "U" : "A"}
                    </div>
                    <div className={`flex flex-col max-w-[72%] ${isUser ? "items-end" : "items-start"}`}>
                      <p className="text-xs text-gray-400 font-medium mb-1.5">{isUser ? "Du" : "BI Agent"}</p>
                      <div className={`text-sm leading-relaxed prose-chat ${isUser
                        ? "bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm"
                        : "bg-white border border-gray-100 shadow-sm text-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm"}`}
                        dangerouslySetInnerHTML={{ __html: md(content) }} />
                      {choices.length > 0 && <ChoiceChips choices={choices} onSelect={send} />}
                    </div>
                  </div>
                );
              })}

              {/* Thinking */}
              {store.sending && (
                <div className="flex gap-3 animate-in">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                    style={{ background: "var(--green)", fontFamily: "Georgia,serif" }}>A</div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1.5">BI Agent</p>
                    <div className="flex items-center gap-2.5 bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
                      <div className="thinking-spinner" />
                      <span className="text-sm italic text-gray-400">{phases[phaseIdx]}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
          <div className="max-w-3xl mx-auto">
            {/* Mode + status */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(["chat","research"] as const).map(mode => (
                  <button key={mode} onClick={() => store.setMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize ${store.mode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                    {mode === "chat" ? "Chat" : "Research"}
                  </button>
                ))}
              </div>
              {store.guidedProject && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: "var(--green-light)", color: "var(--green)", border: "1px solid var(--green-mid)" }}>
                  ⚡ Geführter Modus
                </span>
              )}
            </div>

            {/* Input box */}
            <div className="flex gap-3 items-end bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 transition-all focus-within:border-green-400 focus-within:shadow-sm"
              style={{}}>
              <textarea ref={inputRef} value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 180)}px`; }}
                placeholder={store.guidedProject ? "Beschreibe dein Projekt…" : "Ask anything… (Enter to send)"}
                className="flex-1 bg-transparent border-none resize-none text-sm text-gray-900 outline-none leading-relaxed placeholder:text-gray-400"
                style={{ minHeight: 26, maxHeight: 180, fontFamily: "inherit" }} />
              <button onClick={() => send(input)} disabled={!input.trim() || store.sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-all text-white border-none"
                style={{ background: input.trim() && !store.sending ? "var(--green)" : "#e5e7eb", cursor: input.trim() && !store.sending ? "pointer" : "default", color: input.trim() && !store.sending ? "white" : "#9ca3af" }}>
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
