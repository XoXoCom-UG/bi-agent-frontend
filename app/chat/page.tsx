"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { Button, Badge, Card, TabGroup, Tab } from "@/components/ui";
import { cn } from "@/lib/utils";

const PHASES = ["Verstehe die Frage…","Analysiere Aspekte…","Formuliere Antwort…","Überprüfe…"];
const PHASES_R = ["Recherchiere Quellen…","Analysiere Ergebnisse…","Vergleiche Optionen…","Formuliere Antwort…"];

// Normalise message.content: backend may return an array of content blocks
// (from the Anthropic SDK) instead of a plain string.
function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b: unknown) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object" && "text" in b && typeof (b as { text: unknown }).text === "string")
          return (b as { text: string }).text;
        return "";
      })
      .join("");
  }
  return "";
}

function md(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<div style='font-size:13px;font-weight:600;margin:10px 0 4px;color:#111827'>$1</div>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => `<ul style='margin:8px 0 8px 18px;list-style:disc'>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hudpl\/])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
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
      <p className="text-xs text-gray-400">Wähle oder schreib deine eigene Antwort.</p>
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

      <div className="flex-1 flex flex-col bg-white" style={{ overflow: "hidden" }}>

        {/* Topbar */}
        <header className="flex items-center gap-3 px-5 h-14 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{store.sessionTitle}</p>
            {turns > 0 && <p className="text-xs text-gray-400">{turns} turns</p>}
          </div>
          {store.guidedProject && <Badge variant="default">⚡ Geführter Modus</Badge>}
          <Button variant="outline" size="sm" onClick={() => router.push(`/concept?session=${store.sessionId}`)}>
            ⚡ Concept
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            🗺 Roadmap
          </Button>
        </header>

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {store.messages.length === 0 && !store.sending ? (
            <div className="flex items-center justify-center min-h-full px-8 py-12">
              <div className="max-w-lg w-full text-center animate-in">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-5 shadow-lg"
                  style={{ background: "var(--green)", fontFamily: "Georgia,serif" }}>B</div>
                <Badge variant="default" className="mb-3">IT Consulting Agent</Badge>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Was möchtest du lösen?</h2>
                <p className="text-sm text-gray-500 mb-8">Stell eine Frage oder starte ein geführtes Projekt.</p>

                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  {[
                    { icon: "💬", title: "Chat starten", desc: "Direkter Zugang zur IT-Wissensbasis. Frag alles.", action: () => inputRef.current?.focus() },
                    { icon: "⚡", title: "Projekt starten", desc: "Geführtes Interview → Transformation Concept → Roadmap.", action: () => { store.setGuidedProject(true); inputRef.current?.focus(); } },
                  ].map(c => (
                    <Card key={c.title} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-green-200"
                      onClick={c.action} style={{ cursor: "pointer" }}>
                      <div className="text-2xl mb-3">{c.icon}</div>
                      <p className="font-bold text-sm text-gray-900 mb-1">{c.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
                    </Card>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {["Cloud Migration", "Make.com vs Zapier?", "IT-Sicherheit", "ERP-Auswahl"].map(p => (
                    <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                      className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-600 hover:border-green-300 hover:text-green-800 hover:bg-green-50 transition-all">
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
                let content = toText(m.content);
                let choices: string[] = [];
                const cm = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
                if (cm) { choices = cm[1].split("|").map(s => s.trim()).filter(Boolean); content = content.replace(cm[0], "").trim(); }
                return (
                  <div key={i} className={cn("flex gap-3 animate-in", isUser && "flex-row-reverse")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: isUser ? "#111827" : "var(--green)", fontFamily: isUser ? "inherit" : "Georgia,serif" }}>
                      {isUser ? "U" : "A"}
                    </div>
                    <div className={cn("flex flex-col max-w-[72%]", isUser ? "items-end" : "items-start")}>
                      <p className="text-xs text-gray-400 font-medium mb-1.5">{isUser ? "Du" : "BI Agent"}</p>
                      <div className={cn("text-sm leading-relaxed prose-chat",
                        isUser ? "bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm"
                               : "bg-white border border-gray-100 shadow-sm text-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm")}
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
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1.5">BI Agent</p>
                    <Card className="flex items-center gap-2.5 px-4 py-3 rounded-tl-sm">
                      <div className="thinking-spinner" />
                      <span className="text-sm italic text-gray-400">{phases[phaseIdx]}</span>
                    </Card>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <footer className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <TabGroup>
                <Tab active={store.mode === "chat"} onClick={() => store.setMode("chat")}>Chat</Tab>
                <Tab active={store.mode === "research"} onClick={() => store.setMode("research")}>Research</Tab>
              </TabGroup>
              <span className="flex-1" />
              {turns > 0 && <Badge variant="secondary">{turns} turns</Badge>}
            </div>
            <div className="flex gap-3 items-end bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 focus-within:border-green-400 focus-within:shadow-sm transition-all">
              <textarea ref={inputRef} value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 180)}px`; }}
                placeholder="Ask anything… (Enter to send)"
                className="flex-1 bg-transparent border-none resize-none text-sm text-gray-900 outline-none leading-relaxed placeholder:text-gray-400"
                style={{ minHeight: 26, maxHeight: 180, fontFamily: "inherit" }} />
              <button onClick={() => send(input)} disabled={!input.trim() || store.sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-all border-none"
                style={{ background: input.trim() && !store.sending ? "var(--green)" : "#e5e7eb", color: input.trim() && !store.sending ? "white" : "#9ca3af", cursor: input.trim() && !store.sending ? "pointer" : "default" }}>
                ↑
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
