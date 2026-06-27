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

  async function loadChat(sid: string) {
    if (!token) return;
    try {
      const s = await api.getSession(token, sid);
      store.setSessionId(sid);
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
    <aside className="flex flex-col bg-white border-r border-gray-200 shrink-0" style={{ width: 232, height: "100vh" }}>

      {/* Brand */}
      <button onClick={() => { store.newChat(); router.push("/chat"); }}
        className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 w-full text-left hover:bg-gray-50 transition-colors">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: "var(--green)", fontFamily: "Georgia,serif", fontSize: 15 }}>B</div>
        <span className="font-bold text-sm text-gray-900 tracking-tight">BI Agent</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--green-light)", color: "var(--green)", border: "1px solid var(--green-mid)", fontFamily: "monospace" }}>v3</span>
      </button>

      {/* New chat */}
      <div className="px-3 pt-3 pb-2">
        <button onClick={() => { store.newChat(); router.push("/chat"); }}
          className="w-full h-9 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          style={{ background: "var(--green)" }}>
          <span className="text-base leading-none">+</span> New chat
        </button>
      </div>

      {/* Scroll list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">

        {/* Projects */}
        <div className="flex items-center justify-between px-2 pt-3 pb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Projekte</span>
          <button onClick={newProject} className="text-lg leading-none transition-colors hover:opacity-70"
            style={{ color: "var(--green)", background: "none", border: "none", cursor: "pointer" }}>+</button>
        </div>
        {store.projects.length === 0 && <p className="text-xs px-2 py-1 text-gray-400">Noch keine Projekte.</p>}
        {store.projects.map(p => (
          <div key={p.project_id}>
            <button onClick={() => toggleProject(p.project_id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
              style={{ background: store.activeProjectId === p.project_id ? "var(--green-light)" : "" }}>
              <span className="text-xs" style={{ color: "var(--green)" }}>◆</span>
              <span className="flex-1 text-xs font-medium text-gray-800 truncate">{p.name}</span>
              <span className="text-xs font-mono text-gray-400 bg-gray-100 rounded px-1.5">{p.chats}</span>
              <span className="text-xs text-gray-400">{expanded.has(p.project_id) ? "▾" : "▸"}</span>
            </button>
            {expanded.has(p.project_id) && (
              <div className="ml-3 pl-2.5 border-l" style={{ borderColor: "var(--green-mid)" }}>
                {(store.projectSessions[p.project_id] ?? []).map(s => (
                  <button key={s.session_id} onClick={() => loadChat(s.session_id)}
                    className="w-full flex flex-col px-2 py-1.5 rounded text-left transition-colors hover:bg-gray-50"
                    style={{ background: store.sessionId === s.session_id ? "var(--green-light)" : "" }}>
                    <span className="text-xs font-medium text-gray-800 truncate">{(s.title || "Untitled").slice(0, 28)}</span>
                    <span className="text-xs text-gray-400 mt-0.5">{s.message_count} msg</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Divider */}
        <div className="flex items-center justify-between px-2 pt-4 pb-1 border-t border-gray-100 mt-2">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Konversationen</span>
          <span className="text-xs font-mono text-gray-400">{loose.length}</span>
        </div>
        {loose.length === 0 && <p className="text-xs px-2 py-1 text-gray-400">Noch keine Chats.</p>}
        {loose.map(s => (
          <button key={s.session_id} onClick={() => loadChat(s.session_id)}
            className="w-full flex flex-col px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
            style={{ background: store.sessionId === s.session_id ? "var(--green-light)" : "", borderLeft: store.sessionId === s.session_id ? "2px solid var(--green)" : "2px solid transparent" }}>
            <span className="text-xs font-medium text-gray-800 truncate">{(s.title || "Untitled").slice(0, 30)}</span>
            <span className="text-xs text-gray-400 mt-0.5">
              {new Date(s.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })} · {s.message_count} msg
            </span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "var(--green-light)", border: "1px solid var(--green-mid)", color: "var(--green-dark)" }}>
            {user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span className="flex-1 text-xs text-gray-400 truncate">{user?.email}</span>
          <button onClick={async () => { await signOut(); router.push("/login"); }}
            className="text-sm p-1 rounded hover:bg-gray-100 transition-colors text-gray-400"
            style={{ background: "none", border: "none", cursor: "pointer" }}>⎋</button>
        </div>
      </div>
    </aside>
  );
}
