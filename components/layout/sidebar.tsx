"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button, Badge, Avatar, Separator } from "@/components/ui";
import { cn, dateStr } from "@/lib/utils";

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
      store.setSessionId(sid); store.setSessionTitle(s.title || "Konversation");
      store.setMessages(s.messages ?? []); router.push("/chat");
    } catch {}
  }

  async function toggleProject(pid: string) {
    const n = new Set(expanded);
    if (n.has(pid)) { n.delete(pid); setExpanded(n); return; }
    n.add(pid); setExpanded(n); store.setActiveProject(pid);
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
    <aside className="flex flex-col bg-white border-r border-gray-200 shrink-0" style={{ width: 240, height: "100vh" }}>

      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0"
          style={{ background: "var(--green)", fontFamily: "Georgia,serif" }}>B</div>
        <div>
          <p className="font-bold text-sm text-gray-900 leading-none">BI Agent</p>
          <p className="text-xs text-gray-400 mt-0.5">IT Consulting</p>
        </div>
        <Badge variant="default" className="ml-auto">v3</Badge>
      </div>

      {/* New chat CTA */}
      <div className="p-3">
        <Button onClick={() => { store.newChat(); router.push("/chat"); }} className="w-full" style={{ background: "var(--green)" }}>
          <span className="text-base leading-none">+</span> New chat
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1.5">Navigation</p>
        {[
          { icon: "💬", label: "Chat", path: "/chat" },
          { icon: "⚡", label: "Transformation Concept", path: "/concept" },
          { icon: "🗺", label: "Dashboard", path: "/dashboard" },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 text-left font-medium",
              currentPath === item.path
                ? "text-green-700 bg-green-50 border border-green-100"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
            <span className="text-base">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>

      <Separator />

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">

        {/* Projects */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Projekte</p>
          <button onClick={newProject} className="text-lg leading-none text-green-600 hover:opacity-70 transition-opacity" style={{ background: "none", border: "none", cursor: "pointer" }}>+</button>
        </div>

        {store.projects.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-1">Noch keine Projekte.</p>
        )}

        {store.projects.map(p => (
          <div key={p.project_id}>
            <button onClick={() => toggleProject(p.project_id)}
              className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all",
                store.activeProjectId === p.project_id ? "bg-green-50 text-green-800" : "hover:bg-gray-50 text-gray-700")}>
              <span className="text-xs text-green-600">◆</span>
              <span className="flex-1 text-xs font-medium truncate">{p.name}</span>
              <span className="text-xs font-mono bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">{p.chats}</span>
              <span className="text-xs text-gray-400">{expanded.has(p.project_id) ? "▾" : "▸"}</span>
            </button>
            {expanded.has(p.project_id) && (
              <div className="ml-3 pl-2.5 border-l border-green-200 space-y-0.5 mt-0.5">
                {(store.projectSessions[p.project_id] ?? []).map(s => (
                  <button key={s.session_id} onClick={() => loadChat(s.session_id)}
                    className={cn("w-full flex flex-col px-2 py-1.5 rounded text-left transition-all",
                      store.sessionId === s.session_id ? "bg-green-50 text-green-800" : "hover:bg-gray-50 text-gray-600")}>
                    <span className="text-xs font-medium truncate">{(s.title || "Untitled").slice(0, 26)}</span>
                    <span className="text-xs text-gray-400">{s.message_count} msg</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between px-2 pt-3 pb-1.5 border-t border-gray-100 mt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Konversationen</p>
          <Badge variant="secondary">{loose.length}</Badge>
        </div>

        {loose.length === 0 && <p className="text-xs text-gray-400 px-2 py-1">Noch keine Chats.</p>}

        {loose.map(s => (
          <button key={s.session_id} onClick={() => loadChat(s.session_id)}
            className={cn("w-full flex flex-col px-2 py-2 rounded-lg text-left transition-all",
              store.sessionId === s.session_id ? "bg-green-50 border-l-2 border-green-500 text-green-900 pl-1.5" : "hover:bg-gray-50 text-gray-700")}>
            <span className="text-xs font-medium truncate">{(s.title || "Untitled").slice(0, 28)}</span>
            <span className="text-xs text-gray-400 mt-0.5">{dateStr(s.saved_at)} · {s.message_count} msg</span>
          </button>
        ))}
      </div>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5">
          <Avatar initials={user?.email?.[0]?.toUpperCase() ?? "U"} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{user?.email}</p>
            <p className="text-xs text-gray-400">IT Consultant</p>
          </div>
          <button onClick={async () => { await signOut(); router.push("/login"); }}
            className="text-gray-400 hover:text-gray-700 transition-colors text-sm"
            style={{ background: "none", border: "none", cursor: "pointer" }} title="Abmelden">
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}
