"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export function Sidebar({ currentPath }: { currentPath?: string }) {
  const { token, user, signOut } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
    api.getProjects(token).then(d => store.setProjects(d.projects)).catch(() => {});
  }, [token]);

  async function loadChat(sessionId: string) {
    if (!token) return;
    try {
      const s = await api.getSession(token, sessionId);
      store.setSessionId(sessionId);
      store.setSessionTitle(s.title || "Konversation");
      store.setMessages(s.messages ?? []);
      router.push("/chat");
    } catch {}
  }

  async function toggleProject(pid: string) {
    const n = new Set(expanded);
    if (n.has(pid)) { n.delete(pid); setExpanded(n); return; }
    n.add(pid); setExpanded(n);
    store.setActiveProject(pid);
    if (!store.projectSessions[pid]) {
      try { const d = await api.getProjectSessions(token!, pid); store.setProjectSessions(pid, d.sessions); } catch {}
    }
  }

  async function newProject() {
    const name = prompt("Projektname:");
    if (!name?.trim() || !token) return;
    try { const p = await api.createProject(token, name.trim()); store.setProjects([p, ...store.projects]); store.setActiveProject(p.project_id); } catch {}
  }

  const loose = store.history.filter(s => !s.project_id);

  return (
    <aside className="flex flex-col bg-white border-r flex-shrink-0" style={{ width: 220, height: "100vh", borderColor: "var(--color-line)" }}>

      {/* Brand */}
      <button onClick={() => { store.newChat(); router.push("/chat"); }}
        className="flex items-center gap-2.5 px-4 py-3.5 border-b w-full text-left transition-colors hover:bg-gray-50"
        style={{ borderColor: "var(--color-line)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "var(--color-brand)", fontFamily: "Georgia, serif", fontSize: 15 }}>B</div>
        <span className="font-bold text-sm" style={{ color: "var(--color-ink)", letterSpacing: "-0.01em" }}>BI Agent</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--color-brand-light)", color: "var(--color-brand)", border: "1px solid var(--color-brand-mid)", fontFamily: "monospace" }}>v3</span>
      </button>

      {/* New chat */}
      <div className="px-3 pt-3 pb-2">
        <button onClick={() => { store.newChat(); router.push("/chat"); }}
          className="w-full h-9 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          style={{ background: "var(--color-brand)" }}>
          <span className="text-base leading-none">+</span> New chat
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">

        {/* Projects */}
        <div className="flex items-center justify-between px-2 pt-3 pb-1">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-ink-3)" }}>Projekte</span>
          <button onClick={newProject} className="text-lg leading-none font-light transition-colors"
            style={{ color: "var(--color-brand)", background: "none", border: "none", cursor: "pointer" }}>+</button>
        </div>
        {store.projects.length === 0 && <p className="text-xs px-2 py-1" style={{ color: "var(--color-ink-3)" }}>Noch keine Projekte.</p>}
        {store.projects.map(p => (
          <div key={p.project_id}>
            <button onClick={() => toggleProject(p.project_id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
              style={{ background: store.activeProjectId === p.project_id ? "var(--color-brand-light)" : "transparent" }}>
              <span style={{ color: "var(--color-brand)", fontSize: 11 }}>◆</span>
              <span className="flex-1 text-xs font-medium truncate" style={{ color: "var(--color-ink)" }}>{p.name}</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--color-ink-3)", background: "var(--color-canvas)" }}>{p.chats}</span>
              <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>{expanded.has(p.project_id) ? "▾" : "▸"}</span>
            </button>
            {expanded.has(p.project_id) && (
              <div className="ml-3 pl-2.5 border-l" style={{ borderColor: "var(--color-brand-mid)" }}>
                {(store.projectSessions[p.project_id] ?? []).map(s => (
                  <button key={s.session_id} onClick={() => loadChat(s.session_id)}
                    className="w-full flex flex-col px-2 py-1.5 rounded text-left transition-colors hover:bg-gray-50"
                    style={{ borderLeft: store.sessionId === s.session_id ? "2px solid var(--color-brand)" : "2px solid transparent", background: store.sessionId === s.session_id ? "var(--color-brand-light)" : "transparent" }}>
                    <span className="text-xs font-medium truncate" style={{ color: "var(--color-ink)" }}>{(s.title || "Untitled").slice(0, 28)}</span>
                    <span className="text-xs mt-0.5" style={{ color: "var(--color-ink-3)" }}>{s.message_count} msg</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Conversations */}
        <div className="flex items-center justify-between px-2 pt-4 pb-1 mt-1 border-t" style={{ borderColor: "var(--color-line)" }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-ink-3)" }}>Konversationen</span>
          <span className="text-xs font-mono" style={{ color: "var(--color-ink-3)" }}>{loose.length}</span>
        </div>
        {loose.length === 0 && <p className="text-xs px-2 py-1" style={{ color: "var(--color-ink-3)" }}>Noch keine Chats.</p>}
        {loose.map(s => (
          <button key={s.session_id} onClick={() => loadChat(s.session_id)}
            className="w-full flex flex-col px-2 py-2 rounded-lg mb-0.5 text-left transition-colors hover:bg-gray-50"
            style={{ borderLeft: store.sessionId === s.session_id ? "2px solid var(--color-brand)" : "2px solid transparent", background: store.sessionId === s.session_id ? "var(--color-brand-light)" : "transparent" }}>
            <span className="text-xs font-medium truncate" style={{ color: "var(--color-ink)" }}>{(s.title || "Untitled").slice(0, 28)}</span>
            <span className="text-xs mt-0.5" style={{ color: "var(--color-ink-3)" }}>
              {new Date(s.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })} · {s.message_count} msg
            </span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t p-3" style={{ borderColor: "var(--color-line)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "var(--color-brand-light)", border: "1px solid var(--color-brand-mid)", color: "var(--color-brand-dark)" }}>
            {user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span className="flex-1 text-xs truncate" style={{ color: "var(--color-ink-3)" }}>{user?.email}</span>
          <button onClick={async () => { await signOut(); router.push("/login"); }}
            className="text-sm p-1 rounded transition-colors hover:bg-gray-100"
            style={{ color: "var(--color-ink-3)", background: "none", border: "none", cursor: "pointer" }} title="Abmelden">
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}
