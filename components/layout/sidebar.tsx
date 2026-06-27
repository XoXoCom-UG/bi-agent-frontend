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
    <aside style={{ width: 220, flexShrink: 0, height: "100vh", background: "#fff", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Brand */}
      <button onClick={() => { store.newChat(); router.push("/chat"); }}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 14px 11px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: "none", border: "none", borderBottom: "1px solid var(--border)", width: "100%", textAlign: "left" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, fontFamily: "Georgia,serif", flexShrink: 0 }}>B</div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", letterSpacing: "-0.01em" }}>BI Agent</span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "monospace", color: "var(--green)", background: "var(--green-light)", border: "1px solid var(--green-mid)", borderRadius: 20, padding: "2px 7px", fontWeight: 600 }}>v3</span>
      </button>

      {/* New chat */}
      <div style={{ padding: "10px 10px 6px" }}>
        <button onClick={() => { store.newChat(); router.push("/chat"); }}
          style={{ width: "100%", height: 36, borderRadius: 9, border: "none", background: "var(--green)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
          <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span> New chat
        </button>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {/* Projects */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 6px 3px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>Projekte</span>
          <button onClick={newProject} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--green)", fontSize: 18, lineHeight: 1, padding: "0 2px" }} title="Neues Projekt">+</button>
        </div>
        {store.projects.length === 0 && <p style={{ fontSize: 11, color: "var(--text-3)", padding: "2px 6px 6px" }}>Noch keine Projekte.</p>}
        {store.projects.map(p => (
          <div key={p.project_id}>
            <button onClick={() => toggleProject(p.project_id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 6px", borderRadius: 8, border: "none", background: store.activeProjectId === p.project_id ? "var(--green-light)" : "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", textAlign: "left" }}>
              <span style={{ color: "var(--green)", fontSize: 13 }}>◆</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-3)", background: "var(--bg)", borderRadius: 10, padding: "1px 5px" }}>{p.chats}</span>
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>{expanded.has(p.project_id) ? "▾" : "▸"}</span>
            </button>
            {expanded.has(p.project_id) && (
              <div style={{ marginLeft: 12, paddingLeft: 8, borderLeft: "2px solid var(--green-mid)" }}>
                {(store.projectSessions[p.project_id] ?? []).map(s => (
                  <button key={s.session_id} onClick={() => loadChat(s.session_id)}
                    style={{ width: "100%", display: "flex", flexDirection: "column", padding: "5px 7px", borderRadius: 7, border: "none", background: store.sessionId === s.session_id ? "var(--green-light)" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", borderLeft: store.sessionId === s.session_id ? "2px solid var(--green)" : "2px solid transparent" }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(s.title || "Untitled").slice(0, 32)}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{s.message_count} msg</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Conversations */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 6px 3px", marginTop: 4, borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>Konversationen</span>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-3)" }}>{loose.length}</span>
        </div>
        {loose.length === 0 && <p style={{ fontSize: 11, color: "var(--text-3)", padding: "2px 6px" }}>Noch keine Chats.</p>}
        {loose.map(s => (
          <button key={s.session_id} onClick={() => loadChat(s.session_id)}
            style={{ width: "100%", display: "flex", flexDirection: "column", padding: "6px 7px", borderRadius: 8, border: "none", borderLeft: store.sessionId === s.session_id ? "2px solid var(--green)" : "2px solid transparent", background: store.sessionId === s.session_id ? "var(--green-light)" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(s.title || "Untitled").slice(0, 30)}</span>
            <span style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{new Date(s.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })} · {s.message_count} msg</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green-light)", border: "1px solid var(--green-mid)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--green-dark)", flexShrink: 0 }}>{user?.email?.[0]?.toUpperCase() ?? "U"}</div>
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</span>
          <button onClick={async () => { await signOut(); router.push("/login"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 14, padding: "2px 4px" }} title="Abmelden">⎋</button>
        </div>
      </div>
    </aside>
  );
}
