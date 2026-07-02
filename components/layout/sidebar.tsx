"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn, dateStr } from "@/lib/utils";
import {
  Plus, ChevronRight,
  Search, Settings, Check, X, Folder, FolderOpen, Trash2, LogOut, MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SettingsModal } from "./settings-modal";

export function SidebarHamburger() {
  const store = useChatStore();
  return (
    <button
      onClick={() => store.setSidebarOpen(true)}
      className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect y="2" width="16" height="1.5" rx="0.75" fill="currentColor"/>
        <rect y="7.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
        <rect y="12.5" width="12" height="1.5" rx="0.75" fill="currentColor"/>
      </svg>
    </button>
  );
}

const BTN_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

function PressBtn({ children, onClick, className, title, disabled }: {
  children: React.ReactNode; onClick?: () => void; className?: string; title?: string; disabled?: boolean;
}) {
  return (
    <motion.button whileHover={disabled ? {} : { y: -1 }} whileTap={disabled ? {} : { scale: 0.96 }}
      transition={BTN_SPRING}
      onClick={onClick} title={title} disabled={disabled} className={className}>
      {children}
    </motion.button>
  );
}

export function Sidebar() {
  const { token, user, signOut } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const mobileOpen = store.sidebarOpen;
  const closeMobile = () => store.setSidebarOpen(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Inline project creation
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [projSaving, setProjSaving] = useState(false);
  const projInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-focus input when form opens
  useEffect(() => {
    if (creatingProject) {
      const t = setTimeout(() => projInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [creatingProject]);

  async function loadChat(sid: string, pid: string | null = null) {
    if (!token) return;
    try {
      const s = await api.getSession(token, sid);
      store.setSessionId(sid); store.setSessionTitle(s.title || "Konversation");
      // Keep the project context in sync so follow-up messages stay project-scoped.
      store.setActiveProject(pid ?? s.project_id ?? null);
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

  async function refreshProjectSessions(pid: string) {
    try { const d = await api.getProjectSessions(token!, pid); store.setProjectSessions(pid, d.sessions); } catch {}
  }

  async function submitNewProject() {
    if (!newProjName.trim() || !token || projSaving) return;
    setProjSaving(true);
    try {
      const p = await api.createProject(token, newProjName.trim());
      store.setProjects([p, ...store.projects]);
      store.setActiveProject(p.project_id);
      setExpanded(prev => new Set([...prev, p.project_id]));
      setNewProjName(""); setCreatingProject(false);
    } catch {} finally { setProjSaving(false); }
  }

  function cancelNewProject() {
    setNewProjName(""); setCreatingProject(false);
  }

  function startChatInProject(pid: string) {
    store.newChat();
    store.setActiveProject(pid);
    router.push("/chat");
  }

  // A loose chat outside any project — for quick, one-off questions.
  function startQuickChat() {
    store.newChat();
    store.setActiveProject(null);
    router.push("/chat");
    closeMobile();
  }

  async function deleteChat(sid: string, pid: string | null = null) {
    if (!token) return;
    // Two-step inline confirm: first click arms, second click deletes
    if (confirmDelete !== sid) {
      setConfirmDelete(sid);
      setTimeout(() => setConfirmDelete(c => (c === sid ? null : c)), 2500);
      return;
    }
    setConfirmDelete(null);
    try {
      await api.deleteSession(token, sid);
      store.setHistory(store.history.filter(s => s.session_id !== sid));
      if (pid) refreshProjectSessions(pid);
      if (store.sessionId === sid) store.newChat();
    } catch {}
  }

  async function handleLogout() {
    try { await signOut(); } finally { window.location.href = "/login"; }
  }

  const q = search.toLowerCase();
  const visibleProjects = store.projects.filter(p => !q || p.name.toLowerCase().includes(q));
  // Conversations that don't belong to any project (quick questions, old chats).
  const looseChats = store.history
    .filter(s => !s.project_id)
    .filter(s => !q || (s.title || "").toLowerCase().includes(q))
    .slice(0, 20);
  const initials = (displayName || user?.email || "U")[0].toUpperCase();

  return (
    <>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shrink-0 z-40 transition-transform duration-300",
        "fixed inset-y-0 left-0 md:relative md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )} style={{ width: 240, height: "100vh" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <motion.button whileHover={{ opacity: 0.8 }} onClick={() => { router.push("/chat"); closeMobile(); }} className="flex items-center gap-px leading-none flex-1">
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">matfit</span>
            <span className="font-bold text-sm tracking-tight text-green-600">.ai</span>
          </motion.button>
          <button onClick={closeMobile} className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* New project */}
        <div className="p-3 pb-2">
          <PressBtn
            onClick={() => { setCreatingProject(true); setNewProjName(""); }}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 shadow-sm shadow-green-600/20"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />Neues Projekt
          </PressBtn>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 bg-zinc-50 dark:bg-zinc-800 focus-within:border-zinc-300 dark:focus-within:border-zinc-600 transition-colors duration-150">
            <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Projekte suchen…"
              className="flex-1 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none min-w-0" />
          </div>
        </div>

        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-3" />

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {/* ── Projects header ── */}
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Projekte</p>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => { setCreatingProject(true); setNewProjName(""); }}
              className="w-5 h-5 rounded-md flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors duration-150"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            </motion.button>
          </div>

              {/* ── Inline create form ── */}
              <AnimatePresence>
                {creatingProject && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-1 pb-2 pt-0.5">
                      <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border border-green-300 dark:border-green-700 rounded-lg px-2.5 py-1.5 shadow-sm shadow-green-500/10">
                        <Folder className="w-3.5 h-3.5 text-green-500 flex-shrink-0" strokeWidth={1.5} />
                        <input
                          ref={projInputRef}
                          value={newProjName}
                          onChange={e => setNewProjName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") submitNewProject();
                            if (e.key === "Escape") cancelNewProject();
                          }}
                          placeholder="Projektname…"
                          maxLength={48}
                          className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none min-w-0"
                        />
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={submitNewProject}
                          disabled={!newProjName.trim() || projSaving}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center transition-colors duration-100 flex-shrink-0",
                            newProjName.trim()
                              ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40"
                              : "text-zinc-300 dark:text-zinc-600 cursor-default"
                          )}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={cancelNewProject}
                          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-100 flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={2} />
                        </motion.button>
                      </div>
                      <p className="text-[10px] text-zinc-400 px-1 pt-1">Enter zum Speichern · Esc zum Abbrechen</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Project list ── */}
              {visibleProjects.length === 0 && !creatingProject && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-xs text-zinc-400 px-2 py-1"
                >
                  {q ? "Keine Projekte gefunden." : "Noch keine Projekte."}
                </motion.p>
              )}

              {visibleProjects.map(p => {
                const isActive = store.activeProjectId === p.project_id;
                const isExpanded = expanded.has(p.project_id);
                const sessions = store.projectSessions[p.project_id] ?? [];

                return (
                  <div key={p.project_id}>
                    <div className="group/proj relative">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleProject(p.project_id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-150 pr-8",
                          isActive
                            ? "bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-400"
                        )}
                      >
                        {isExpanded
                          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-green-500" strokeWidth={1.5} />
                          : <Folder className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? "text-green-600" : "text-zinc-400")} strokeWidth={1.5} />
                        }
                        <span className="flex-1 text-xs font-medium truncate">{p.name}</span>
                        <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded flex-shrink-0">
                          {p.chats}
                        </span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ type: "spring", duration: 0.25, bounce: 0.1 }}
                          className="flex-shrink-0"
                        >
                          <ChevronRight className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
                        </motion.span>
                      </motion.button>

                      {/* New chat in project — appears on hover */}
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={e => { e.stopPropagation(); startChatInProject(p.project_id); }}
                        title="Neuer Chat in diesem Projekt"
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors duration-100 opacity-0 group-hover/proj:opacity-100"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2} />
                      </motion.button>
                    </div>

                    {/* Expanded sessions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", duration: 0.3, bounce: 0.04 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-3 pl-2.5 border-l border-green-200 dark:border-green-900 mt-0.5 pb-1">
                            {sessions.length === 0 ? (
                              <div className="py-2 px-2 space-y-1.5">
                                <p className="text-[10px] text-zinc-400">Noch keine Chats in diesem Projekt.</p>
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => startChatInProject(p.project_id)}
                                  className="flex items-center gap-1.5 text-[10px] font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-100"
                                >
                                  <Plus className="w-3 h-3" strokeWidth={2} />
                                  Chat starten
                                </motion.button>
                              </div>
                            ) : (
                              <div className="space-y-0.5 pt-0.5">
                                {sessions.map(s => (
                                  <div key={s.session_id} className="group/chat relative">
                                    <motion.button
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => loadChat(s.session_id, p.project_id)}
                                      className={cn(
                                        "w-full flex flex-col px-2 py-1.5 rounded text-left transition-colors duration-150 pr-7",
                                        store.sessionId === s.session_id
                                          ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300"
                                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                      )}
                                    >
                                      <span className="text-xs font-medium truncate">{(s.title || "Untitled").slice(0, 26)}</span>
                                      <span className="text-[10px] text-zinc-400">{dateStr(s.saved_at)} · {s.message_count} msg</span>
                                    </motion.button>
                                    <motion.button
                                      whileTap={{ scale: 0.88 }}
                                      onClick={e => { e.stopPropagation(); deleteChat(s.session_id, p.project_id); }}
                                      title={confirmDelete === s.session_id ? "Klicken zum Löschen" : "Chat löschen"}
                                      className={cn(
                                        "absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center transition-all duration-150",
                                        confirmDelete === s.session_id
                                          ? "opacity-100 text-white bg-red-500 hover:bg-red-600"
                                          : "opacity-0 group-hover/chat:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                      )}
                                    >
                                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                                    </motion.button>
                                  </div>
                                ))}
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => startChatInProject(p.project_id)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-[10px] font-medium text-zinc-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150"
                                >
                                  <Plus className="w-3 h-3" strokeWidth={2} />
                                  Neuer Chat
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

          {/* ── Quick questions (chats outside any project) ── */}
          <div className="flex items-center justify-between px-2 pt-4 pb-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Schnelle Fragen</p>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={startQuickChat}
              title="Schnelle Frage stellen — ohne Projekt"
              className="w-5 h-5 rounded-md flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors duration-150"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            </motion.button>
          </div>

          {looseChats.length === 0 ? (
            <button onClick={startQuickChat}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-zinc-400 hover:text-green-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150">
              <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              Frag etwas — ohne Projekt
            </button>
          ) : (
            <div className="space-y-0.5">
              {looseChats.map(s => (
                <div key={s.session_id} className="group/chat relative">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => loadChat(s.session_id, null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors duration-150 pr-7",
                      store.sessionId === s.session_id
                        ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <MessageCircle className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" strokeWidth={1.5} />
                    <span className="flex-1 text-xs font-medium truncate">{(s.title || "Untitled").slice(0, 30)}</span>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0">{dateStr(s.saved_at)}</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={e => { e.stopPropagation(); deleteChat(s.session_id); }}
                    title={confirmDelete === s.session_id ? "Klicken zum Löschen" : "Chat löschen"}
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center transition-all duration-150",
                      confirmDelete === s.session_id
                        ? "opacity-100 text-white bg-red-500 hover:bg-red-600"
                        : "opacity-0 group-hover/chat:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    )}
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  </motion.button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-3 shrink-0 flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setSettingsOpen(true)}
            className="flex-1 flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 group min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-green-800 dark:text-green-400 select-none"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {displayName || user?.email?.split("@")[0] || user?.email || "Profil"}
              </p>
              <p className="text-xs text-zinc-400">Einstellungen</p>
            </div>
            <Settings className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors duration-150 flex-shrink-0" strokeWidth={1.5} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleLogout}
            title="Abmelden"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors duration-150 shrink-0"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </motion.button>
        </div>
      </aside>
    </>
  );
}
