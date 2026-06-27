"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { truncate, dateStr } from "@/lib/utils";
import { FolderOpen, ChevronDown, ChevronRight, Plus, MessageSquare, Trash2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const { token, user, signOut } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loadingProject, setLoadingProject] = useState<string | null>(null);

  // Load history and projects on mount
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
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleProject(pid: string) {
    const next = new Set(expandedProjects);
    if (next.has(pid)) { next.delete(pid); setExpandedProjects(next); return; }
    next.add(pid);
    setExpandedProjects(next);
    store.setActiveProject(pid);
    if (!store.projectSessions[pid]) {
      setLoadingProject(pid);
      try {
        const d = await api.getProjectSessions(token!, pid);
        store.setProjectSessions(pid, d.sessions);
      } catch (e) { console.error(e); }
      finally { setLoadingProject(null); }
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

  async function handleDeleteSession(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    if (!token || !confirm("Konversation löschen?")) return;
    await api.deleteSession(token, sessionId);
    store.setHistory(store.history.filter(s => s.session_id !== sessionId));
  }

  // Loose conversations (not in any project)
  const loose = store.history.filter(s => !s.project_id);

  return (
    <aside className="flex flex-col h-full bg-card border-r border-border w-64 shrink-0">
      {/* Brand */}
      <button onClick={store.newChat}
        className="flex items-center gap-2.5 px-4 py-4 hover:bg-muted/50 transition-colors cursor-pointer text-left">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm font-serif shrink-0"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}>B</div>
        <span className="font-semibold text-sm tracking-tight">BI Agent</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground border border-border rounded-full px-2 py-0.5">v3</span>
      </button>

      {/* New chat */}
      <div className="px-3 pb-3">
        <button onClick={store.newChat}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
          <Plus size={14} strokeWidth={2.5} />
          New chat
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-4">
        {/* Projects */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Projekte</span>
            <button onClick={createProject}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Neues Projekt">
              <Plus size={14} />
            </button>
          </div>
          {store.projects.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">Noch keine Projekte.</p>
          )}
          {store.projects.map(p => (
            <div key={p.project_id}>
              <button onClick={() => toggleProject(p.project_id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors hover:bg-muted/60 ${store.activeProjectId === p.project_id ? "bg-muted/60" : ""}`}>
                <FolderOpen size={14} className="text-muted-foreground shrink-0" style={{ color: "var(--accent-2)" }} />
                <span className="flex-1 text-left truncate">{p.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5">{p.chats}</span>
                {expandedProjects.has(p.project_id)
                  ? <ChevronDown size={12} className="text-muted-foreground" />
                  : <ChevronRight size={12} className="text-muted-foreground" />}
              </button>
              {expandedProjects.has(p.project_id) && (
                <div className="ml-4 pl-2 border-l border-border space-y-0.5 mt-0.5">
                  {loadingProject === p.project_id && (
                    <p className="text-xs text-muted-foreground py-1 px-2">Lädt…</p>
                  )}
                  {(store.projectSessions[p.project_id] ?? []).map(s => (
                    <SessionRow key={s.session_id} session={s}
                      active={store.sessionId === s.session_id}
                      onClick={() => loadChat(s.session_id)}
                      onDelete={(e) => handleDeleteSession(e, s.session_id)} />
                  ))}
                  {!loadingProject && (store.projectSessions[p.project_id]?.length ?? 0) === 0 && (
                    <p className="text-xs text-muted-foreground py-1 px-2">Noch keine Chats.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loose conversations */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Konversationen</span>
            <span className="text-[10px] font-mono text-muted-foreground">{loose.length}</span>
          </div>
          {loose.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">Noch keine Chats.</p>
          )}
          {loose.map(s => (
            <SessionRow key={s.session_id} session={s}
              active={store.sessionId === s.session_id}
              onClick={() => loadChat(s.session_id)}
              onDelete={(e) => handleDeleteSession(e, s.session_id)} />
          ))}
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold uppercase">
            {user?.email?.[0] ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.email}</p>
          </div>
          <button onClick={async () => { await signOut(); router.push("/login"); }}
            className="text-muted-foreground hover:text-foreground transition-colors" title="Abmelden">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SessionRow({ session, active, onClick, onDelete }: {
  session: { session_id: string; title: string; saved_at: string; message_count: number };
  active: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onClick}
      className={`group w-full flex items-start gap-2 px-2 py-2 rounded-lg text-sm transition-colors hover:bg-muted/60 text-left relative ${active ? "bg-muted/60 border-l-2 pl-1.5" : ""}`}
      style={active ? { borderLeftColor: "var(--accent)" } : {}}>
      <MessageSquare size={13} className="text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{truncate(session.title, 40)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{dateStr(session.saved_at)} · {session.message_count} msg</p>
      </div>
      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0 mt-0.5">
        <Trash2 size={12} />
      </button>
    </button>
  );
}
