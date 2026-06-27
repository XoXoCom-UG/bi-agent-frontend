"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export function Sidebar({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const { token, user, signOut } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
    api.getProjects(token).then(d => store.setProjects(d.projects)).catch(() => {});
  }, [token]);

  async function loadChat(sessionId: string) {
    if (!token) return;
    try {
      const sess = await api.getSession(token, sessionId);
      store.setSessionId(sessionId);
      store.setSessionTitle(sess.title || "Konversation");
      store.setMessages(sess.messages ?? []);
      onNavigate?.("/chat");
    } catch (e) { console.error(e); }
  }

  async function toggleProject(pid: string) {
    const next = new Set(expandedProjects);
    if (next.has(pid)) { next.delete(pid); setExpandedProjects(next); return; }
    next.add(pid);
    setExpandedProjects(next);
    store.setActiveProject(pid);
    if (!store.projectSessions[pid]) {
      try {
        const d = await api.getProjectSessions(token!, pid);
        store.setProjectSessions(pid, d.sessions);
      } catch (e) { console.error(e); }
    }
  }

  async function createProject() {
    const name = prompt("Projektname:");
    if (!name?.trim() || !token) return;
    try {
      const p = await api.createProject(token, name.trim());
      store.setProjects([p, ...store.projects]);
      store.setActiveProject(p.project_id);
    } catch (e) { console.error(e); }
  }

  const loose = store.history.filter(s => !s.project_id);

  const s = {
    aside: { width: 248, minWidth: 248, height: "100vh", background: "var(--bg2)", borderRight: "1px solid var(--border)", display: "flex" as const, flexDirection: "column" as const, overflow: "hidden" },
    brand: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 10px", cursor: "pointer", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
    brandMark: { width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, fontFamily: "Georgia,serif", flexShrink: 0 },
    brandName: { fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" },
    brandBadge: { marginLeft: "auto", fontSize: 10, fontFamily: "monospace", color: "var(--text2)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 7px" },
    newChat: { margin: "10px 12px 4px", height: 38, borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" } as React.CSSProperties,
    scroll: { flex: 1, overflowY: "auto" as const, padding: "8px 8px" },
    sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px 4px", marginTop: 4 },
    sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted)" },
    emptyText: { fontSize: 12, color: "var(--muted)", padding: "4px 8px" },
    projRow: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, cursor: "pointer", background: active ? "var(--panel)" : "transparent", border: "none", width: "100%", textAlign: "left" as const, fontFamily: "inherit", color: "var(--text)", fontSize: 13, transition: "background 0.15s" } as React.CSSProperties),
    projName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
    projCount: { fontSize: 10, fontFamily: "monospace", color: "var(--muted)", background: "var(--panel)", borderRadius: 10, padding: "1px 6px" },
    projChildren: { marginLeft: 14, paddingLeft: 8, borderLeft: "1px solid var(--border)", marginBottom: 4 },
    chatRow: (active: boolean) => ({ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 8px", borderRadius: 8, cursor: "pointer", background: active ? "var(--panel)" : "transparent", border: active ? "none" : "none", borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent", width: "100%", textAlign: "left" as const, fontFamily: "inherit", color: "var(--text)", transition: "background 0.15s" } as React.CSSProperties),
    chatTitle: { fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1 },
    chatMeta: { fontSize: 10, color: "var(--muted)", marginTop: 2 },
    footer: { borderTop: "1px solid var(--border)", padding: "10px 12px" },
    footerInner: { display: "flex", alignItems: "center", gap: 8 },
    avatar: { width: 28, height: 28, borderRadius: "50%", background: "var(--panel)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0, color: "var(--text2)" },
    footerEmail: { flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: "var(--text2)" },
    signout: { background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16, padding: "2px 4px", fontFamily: "inherit" },
  };

  return (
    <aside style={s.aside}>
      <div style={s.brand} onClick={() => { store.newChat(); onNavigate?.("/chat"); }}>
        <div style={s.brandMark}>B</div>
        <span style={s.brandName}>BI Agent</span>
        <span style={s.brandBadge}>v3</span>
      </div>

      <button style={s.newChat} onClick={() => { store.newChat(); onNavigate?.("/chat"); }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New chat
      </button>

      <div style={s.scroll}>
        {/* Projects */}
        <div style={s.sectionHead}>
          <span style={s.sectionLabel}>Projekte</span>
          <button onClick={createProject} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 18, lineHeight: 1, padding: "0 2px" }} title="Neues Projekt">+</button>
        </div>
        {store.projects.length === 0 && <p style={s.emptyText}>Noch keine Projekte.</p>}
        {store.projects.map(p => (
          <div key={p.project_id}>
            <button style={s.projRow(store.activeProjectId === p.project_id)} onClick={() => toggleProject(p.project_id)}>
              <span style={{ color: "var(--accent2)", fontSize: 13 }}>📁</span>
              <span style={s.projName}>{p.name}</span>
              <span style={s.projCount}>{p.chats}</span>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{expandedProjects.has(p.project_id) ? "▾" : "▸"}</span>
            </button>
            {expandedProjects.has(p.project_id) && (
              <div style={s.projChildren}>
                {(store.projectSessions[p.project_id] ?? []).length === 0
                  ? <p style={s.emptyText}>Noch keine Chats.</p>
                  : (store.projectSessions[p.project_id] ?? []).map(sess => (
                    <button key={sess.session_id} style={s.chatRow(store.sessionId === sess.session_id)} onClick={() => loadChat(sess.session_id)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.chatTitle}>{sess.title?.slice(0, 38) || "Untitled"}</div>
                        <div style={s.chatMeta}>{sess.message_count} msg</div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}

        {/* Loose chats */}
        <div style={s.sectionHead}>
          <span style={s.sectionLabel}>Konversationen</span>
          <span style={{ ...s.sectionLabel, letterSpacing: 0 }}>{loose.length}</span>
        </div>
        {loose.length === 0 && <p style={s.emptyText}>Noch keine Chats.</p>}
        {loose.map(sess => (
          <button key={sess.session_id} style={s.chatRow(store.sessionId === sess.session_id)} onClick={() => loadChat(sess.session_id)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.chatTitle}>{sess.title?.slice(0, 38) || "Untitled"}</div>
              <div style={s.chatMeta}>{new Date(sess.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })} · {sess.message_count} msg</div>
            </div>
          </button>
        ))}
      </div>

      <div style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.avatar}>{user?.email?.[0]?.toUpperCase() ?? "U"}</div>
          <span style={s.footerEmail}>{user?.email}</span>
          <button style={s.signout} title="Abmelden" onClick={async () => { await signOut(); router.push("/login"); }}>⎋</button>
        </div>
      </div>
    </aside>
  );
}
