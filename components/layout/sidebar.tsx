"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn, dateStr } from "@/lib/utils";
import { MessageSquare, Zap, LayoutDashboard, Plus, ChevronRight, Search, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SettingsModal } from "./settings-modal";

function PressBtn({ children, onClick, className, title, disabled }: {
  children: React.ReactNode; onClick?: () => void; className?: string; title?: string; disabled?: boolean;
}) {
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={onClick} title={title} disabled={disabled} className={className}>
      {children}
    </motion.button>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.97 }}
      whileHover={{ x: active ? 0 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 mb-0.5 text-left font-medium",
        active
          ? "text-green-700 bg-green-50 border border-green-100 dark:text-green-400 dark:bg-green-950 dark:border-green-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
      <span className="truncate">{label}</span>
      {active && (
        <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="ml-auto">
          <ChevronRight className="w-3 h-3 text-green-400" strokeWidth={2} />
        </motion.span>
      )}
    </motion.button>
  );
}

export function Sidebar({ currentPath }: { currentPath?: string }) {
  const { token, user, signOut } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    setDisplayName(localStorage.getItem("matfit_name") || "");
    const onStorage = () => setDisplayName(localStorage.getItem("matfit_name") || "");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    if (!settingsOpen) setDisplayName(localStorage.getItem("matfit_name") || "");
  }, [settingsOpen]);
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

  const q = search.toLowerCase();
  const loose = store.history.filter(s => !s.project_id).filter(s => !q || (s.title || "").toLowerCase().includes(q));
  const initials = (displayName || user?.email || "U")[0].toUpperCase();

  return (
    <>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <aside className="flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shrink-0 relative z-20" style={{ width: 240, height: "100vh" }}>

        {/* Text logo — no icon */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <motion.button whileHover={{ opacity: 0.8 }} onClick={() => router.push("/chat")} className="flex items-center gap-px leading-none">
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">matfit</span>
            <span className="font-bold text-sm tracking-tight text-green-600">.ai</span>
          </motion.button>
        </div>

        {/* New chat */}
        <div className="p-3 pb-2">
          <PressBtn onClick={() => { store.newChat(); router.push("/chat"); }}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 shadow-sm shadow-green-600/20">
            <Plus className="w-4 h-4" strokeWidth={2} />Neuer Chat
          </PressBtn>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 bg-zinc-50 dark:bg-zinc-800 focus-within:border-zinc-300 dark:focus-within:border-zinc-600 transition-colors duration-150">
            <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chats suchen…"
              className="flex-1 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none min-w-0" />
          </div>
        </div>

        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-3" />

        {/* Navigation */}
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-2 mb-1.5">Navigation</p>
          {[
            { icon: MessageSquare, label: "Chat",      path: "/chat"      },
            { icon: Zap,           label: "Concept",   path: "/concept"   },
            { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
          ].map(({ icon, label, path }) => (
            <NavItem key={path} icon={icon} label={label} active={currentPath === path} onClick={() => router.push(path)} />
          ))}
        </div>

        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-3" />

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {!q && (
            <>
              <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Projekte</p>
                <motion.button whileTap={{ scale: 0.88 }} onClick={newProject}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors duration-150">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </motion.button>
              </div>
              {store.projects.length === 0 && <p className="text-xs text-zinc-400 px-2 py-1">Noch keine Projekte.</p>}
              {store.projects.map(p => (
                <div key={p.project_id}>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => toggleProject(p.project_id)}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-150",
                      store.activeProjectId === p.project_id
                        ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-400")}>
                    <span className="text-xs text-green-600">◆</span>
                    <span className="flex-1 text-xs font-medium truncate">{p.name}</span>
                    <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{p.chats}</span>
                    <motion.span animate={{ rotate: expanded.has(p.project_id) ? 90 : 0 }} transition={{ type: "spring", duration: 0.28, bounce: 0.1 }}>
                      <ChevronRight className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
                    </motion.span>
                  </motion.button>
                  <AnimatePresence>
                    {expanded.has(p.project_id) && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", duration: 0.32, bounce: 0.05 }}
                        className="overflow-hidden ml-3 pl-2.5 border-l border-green-200 dark:border-green-900 space-y-0.5 mt-0.5">
                        {(store.projectSessions[p.project_id] ?? []).map(s => (
                          <motion.button key={s.session_id} whileTap={{ scale: 0.97 }} onClick={() => loadChat(s.session_id)}
                            className={cn("w-full flex flex-col px-2 py-1.5 rounded text-left transition-colors duration-150",
                              store.sessionId === s.session_id
                                ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400")}>
                            <span className="text-xs font-medium truncate">{(s.title || "Untitled").slice(0, 26)}</span>
                            <span className="text-xs text-zinc-400">{s.message_count} msg</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              <div className="flex items-center justify-between px-2 pt-3 pb-1.5 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Konversationen</p>
                <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full px-1.5 py-0.5">{loose.length}</span>
              </div>
            </>
          )}
          {q && <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest px-2 pt-1 pb-1.5">Ergebnisse ({loose.length})</p>}
          {loose.length === 0 && <p className="text-xs text-zinc-400 px-2 py-1">{q ? "Keine Chats gefunden." : "Noch keine Chats."}</p>}
          {loose.map(s => (
            <motion.button key={s.session_id} whileTap={{ scale: 0.97 }} onClick={() => loadChat(s.session_id)}
              className={cn("w-full flex flex-col px-2 py-2 rounded-lg text-left transition-colors duration-150",
                store.sessionId === s.session_id
                  ? "bg-green-50 dark:bg-green-950 border-l-2 border-green-500 text-green-900 dark:text-green-300 pl-1.5"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-400")}>
              <span className="text-xs font-medium truncate">{(s.title || "Untitled").slice(0, 30)}</span>
              <span className="text-xs text-zinc-400 mt-0.5">{dateStr(s.saved_at)} · {s.message_count} msg</span>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-3 shrink-0">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-green-800 dark:text-green-400 select-none"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {displayName || user?.email?.split("@")[0] || user?.email || "Profil"}
              </p>
              <p className="text-xs text-zinc-400">Einstellungen öffnen</p>
            </div>
            <Settings className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors duration-150 flex-shrink-0" strokeWidth={1.5} />
          </motion.button>
        </div>
      </aside>
    </>
  );
}
