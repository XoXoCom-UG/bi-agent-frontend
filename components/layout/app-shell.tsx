"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SettingsModal } from "./settings-modal";
import { AssistantDock } from "./right-panel";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Map, Folder, FolderOpen, Plus, ChevronDown, Check, X,
  Settings, LogOut, GripVertical, MessageCircle,
} from "lucide-react";

type ActiveScreen = "chat" | "concept" | "dashboard";

/**
 * AppShell — the shared frame for Chat, Concept and Dashboard (Patryk sketch,
 * 2026-07-07). No left sidebar. A single horizontal topbar carries the logo,
 * a "Projekte" drag-drop dropdown and the two permanent buttons (Transformation
 * Concept / Roadmap). The persistent assistant lives on the right via AssistantDock.
 */
export function AppShell({ active, children }: { active: ActiveScreen; children: React.ReactNode }) {
  const { token, user, signOut } = useAuth();
  const store = useChatStore();
  const router = useRouter();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");

  // Load projects + history once (the old sidebar used to do this).
  useEffect(() => {
    if (!token) return;
    api.getProjects(token).then(d => store.setProjects(d.projects)).catch(() => {});
    api.getHistory(token).then(d => store.setHistory(d.sessions)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setDisplayName(localStorage.getItem("matfit_name") || "");
    const onStorage = () => setDisplayName(localStorage.getItem("matfit_name") || "");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function goHome() {
    store.newChat();
    store.setActiveProject(null);
    router.push("/chat");
  }

  const sessionId = store.sessionId;

  return (
    <div className="flex bg-zinc-50 dark:bg-zinc-950" style={{ height: "100vh", overflow: "hidden" }}>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 min-w-0" style={{ overflow: "hidden" }}>

        {/* ── Topbar ─────────────────────────────────────────────────── */}
        <header className="flex items-center gap-2 md:gap-3 px-3 md:px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          {/* Logo → home */}
          <button onClick={goHome} className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex items-center gap-px leading-none">
              <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50">matfit</span>
              <span className="font-bold text-base tracking-tight text-green-600">.ai</span>
            </div>
            <span className="hidden xl:inline text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-400 ml-1">
              KI-gestützte IT-Beratung
            </span>
          </button>

          {/* Projekte dropdown */}
          <ProjectsMenu active={active} />

          {/* Permanent nav buttons */}
          <div className="flex items-center gap-1.5">
            <TopButton
              icon={<Zap className="w-3.5 h-3.5" strokeWidth={1.5} />}
              label="Transformation Concept"
              shortLabel="Konzept"
              active={active === "concept"}
              onClick={() => router.push(`/concept?session=${sessionId}`)}
            />
            <TopButton
              icon={<Map className="w-3.5 h-3.5" strokeWidth={1.5} />}
              label="Roadmap"
              shortLabel="Roadmap"
              active={active === "dashboard"}
              onClick={() => router.push(`/dashboard?session=${sessionId}`)}
            />
          </div>

          <div className="flex-1" />

          {/* User + settings + logout */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-green-800 dark:text-green-400 select-none"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                {(displayName || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                  {displayName || user?.email?.split("@")[0] || "Profil"}
                </p>
                <p className="text-[10px] text-zinc-400">Einstellungen</p>
              </div>
            </button>
            <button onClick={() => setSettingsOpen(true)} title="Einstellungen"
              className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button onClick={async () => { try { await signOut(); } finally { window.location.href = "/login"; } }}
              title="Abmelden"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Page body */}
        {children}
      </div>

      {/* Right: persistent assistant */}
      <AssistantDock token={token} projectId={store.activeProjectId} />
    </div>
  );
}

// ── Top nav button ──────────────────────────────────────────────────────────
function TopButton({ icon, label, shortLabel, active, onClick }: {
  icon: React.ReactNode; label: string; shortLabel: string; active: boolean; onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 md:px-3 py-2 border transition-colors duration-150",
        active
          ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-900"
          : "text-zinc-600 dark:text-zinc-300 border-green-200 dark:border-green-900/60 hover:bg-green-50/60 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-400"
      )}>
      {icon}
      <span className="hidden md:inline">{label}</span>
      <span className="md:hidden">{shortLabel}</span>
    </motion.button>
  );
}

// ── Projekte dropdown (drag-drop reorder) ─────────────────────────────────────
function ProjectsMenu({ active }: { active: ActiveScreen }) {
  const { token } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false); }
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => { if (creating) setTimeout(() => inputRef.current?.focus(), 50); }, [creating]);

  const activeProject = store.projects.find(p => p.project_id === store.activeProjectId) ?? null;
  const looseChats = store.history.filter(s => !s.project_id).slice(0, 6);

  async function openProject(pid: string) {
    if (!token) return;
    store.setActiveProject(pid);
    setOpen(false);
    try {
      const d = await api.getProjectSessions(token, pid);
      store.setProjectSessions(pid, d.sessions);
      const latest = d.sessions[0];
      if (latest) {
        const s = await api.getSession(token, latest.session_id);
        store.setSessionId(latest.session_id);
        store.setSessionTitle(s.title || "Konversation");
        store.setMessages(s.messages ?? []);
      } else {
        store.newChat();
        store.setActiveProject(pid);
      }
    } catch { store.newChat(); store.setActiveProject(pid); }
    router.push("/chat");
  }

  async function createProject() {
    if (!name.trim() || !token || saving) return;
    setSaving(true);
    try {
      const p = await api.createProject(token, name.trim());
      store.setProjects([p, ...store.projects]);
      store.newChat();
      store.setActiveProject(p.project_id);
      store.setGuidedProject(true);
      setName(""); setCreating(false); setOpen(false);
      router.push("/chat");
    } catch {} finally { setSaving(false); }
  }

  function startQuickChat() {
    store.newChat();
    store.setActiveProject(null);
    setOpen(false);
    router.push("/chat");
  }

  async function loadLooseChat(sid: string) {
    if (!token) return;
    setOpen(false);
    try {
      const s = await api.getSession(token, sid);
      store.setSessionId(sid);
      store.setSessionTitle(s.title || "Konversation");
      store.setActiveProject(null);
      store.setMessages(s.messages ?? []);
    } catch {}
    router.push("/chat");
  }

  // Drag-drop reorder (client-side order)
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = store.projects.map(p => p.project_id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    store.reorderProjects(ids);
    setDragId(null);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-2 border transition-colors duration-150 max-w-[180px]",
          active === "chat" && activeProject
            ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-900"
            : "text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        )}>
        {activeProject
          ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-green-600" strokeWidth={1.5} />
          : <Folder className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />}
        <span className="truncate">{activeProject ? activeProject.name : "Projekte"}</span>
        <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform", open && "rotate-180")} strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.22, bounce: 0 }}
            className="absolute left-0 top-full mt-1.5 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl shadow-black/10 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Projekte</p>
              <button onClick={() => setCreating(c => !c)}
                className="w-5 h-5 rounded-md flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors">
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>

            {/* Inline create */}
            <AnimatePresence>
              {creating && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.25, bounce: 0 }} className="overflow-hidden">
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <Folder className="w-3.5 h-3.5 text-green-500 shrink-0" strokeWidth={1.5} />
                    <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") createProject(); if (e.key === "Escape") { setCreating(false); setName(""); } }}
                      placeholder="Projektname…" maxLength={48}
                      className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none min-w-0" />
                    <button onClick={createProject} disabled={!name.trim() || saving}
                      className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0",
                        name.trim() ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40" : "text-zinc-300 cursor-default")}>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <button onClick={() => { setCreating(false); setName(""); }}
                      className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 shrink-0">
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project list (drag to reorder) */}
            <div className="max-h-64 overflow-y-auto py-1">
              {store.projects.length === 0 && !creating && (
                <p className="text-xs text-zinc-400 px-3 py-3 text-center">Noch keine Projekte.</p>
              )}
              {store.projects.map(p => {
                const isActive = store.activeProjectId === p.project_id;
                return (
                  <div key={p.project_id}
                    draggable
                    onDragStart={() => setDragId(p.project_id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDrop(p.project_id)}
                    className={cn(
                      "group/pi flex items-center gap-1.5 px-2 py-1.5 mx-1 rounded-lg cursor-pointer transition-colors",
                      isActive ? "bg-green-50 dark:bg-green-950/60" : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                      dragId === p.project_id && "opacity-40"
                    )}
                    onClick={() => openProject(p.project_id)}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 shrink-0 cursor-grab active:cursor-grabbing" strokeWidth={1.5} />
                    <Folder className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-green-600" : "text-zinc-400")} strokeWidth={1.5} />
                    <span className={cn("flex-1 text-xs font-medium truncate", isActive ? "text-green-800 dark:text-green-300" : "text-zinc-700 dark:text-zinc-300")}>
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5 shrink-0">{p.chats}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick questions (loose chats) */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 py-1">
              <button onClick={startQuickChat}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-green-600 shrink-0" strokeWidth={1.5} />
                Schnelle Frage — ohne Projekt
              </button>
              {looseChats.map(s => (
                <button key={s.session_id} onClick={() => loadLooseChat(s.session_id)}
                  className="w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{(s.title || "Untitled").slice(0, 34)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
