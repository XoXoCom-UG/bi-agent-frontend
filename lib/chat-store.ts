"use client";

import { create } from "zustand";
import { Message, Session, Project } from "@/lib/api";
import { newSessionId } from "@/lib/utils";

/** A snippet the user wants to discuss with the assistant (selected text, a
 *  roadmap tool, a concept row). Pushed from any page into the shared panel. */
export interface AssistantContext {
  quote: string;
  question?: string;
}

interface ChatStore {
  // current session
  sessionId: string;
  sessionTitle: string;
  messages: Message[];
  history: Session[];
  projects: Project[];
  projectSessions: Record<string, Session[]>;
  activeProjectId: string | null;
  sending: boolean;
  mode: "chat" | "research";
  guidedProject: boolean;
  thinkingPhase: string;
  sidebarOpen: boolean;

  // shared assistant panel (right side, present on every screen)
  assistantContext: AssistantContext | null;
  assistantContextNonce: number;
  assistantOpenMobile: boolean;
  // A short description of what the user currently sees on the left (chat /
  // concept / roadmap), so the right-side assistant knows the context.
  leftContext: string;

  // actions
  setSessionId: (id: string) => void;
  setSessionTitle: (t: string) => void;
  setMessages: (m: Message[]) => void;
  addMessage: (m: Message) => void;
  setHistory: (h: Session[]) => void;
  setProjects: (p: Project[]) => void;
  setProjectSessions: (pid: string, s: Session[]) => void;
  setActiveProject: (id: string | null) => void;
  setSending: (b: boolean) => void;
  setMode: (m: "chat" | "research") => void;
  setGuidedProject: (b: boolean) => void;
  setThinkingPhase: (p: string) => void;
  setSidebarOpen: (b: boolean) => void;
  reorderProjects: (ids: string[]) => void;
  pushAssistant: (ctx: AssistantContext) => void;
  setAssistantOpenMobile: (b: boolean) => void;
  setLeftContext: (c: string) => void;
  newChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessionId: newSessionId(),
  sessionTitle: "Neue Konversation",
  messages: [],
  history: [],
  projects: [],
  projectSessions: {},
  activeProjectId: null,
  sending: false,
  mode: "chat",
  guidedProject: false,
  thinkingPhase: "",
  sidebarOpen: false,
  assistantContext: null,
  assistantContextNonce: 0,
  assistantOpenMobile: false,
  leftContext: "",

  setSessionId: (id) => set({ sessionId: id }),
  setSessionTitle: (t) => set({ sessionTitle: t }),
  setMessages: (m) => set({ messages: m }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setHistory: (h) => set({ history: h }),
  setProjects: (p) => set({ projects: p }),
  setProjectSessions: (pid, s) =>
    set((state) => ({ projectSessions: { ...state.projectSessions, [pid]: s } })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setSending: (b) => set({ sending: b }),
  setMode: (m) => set({ mode: m }),
  setGuidedProject: (b) => set({ guidedProject: b }),
  setThinkingPhase: (p) => set({ thinkingPhase: p }),
  setSidebarOpen: (b) => set({ sidebarOpen: b }),
  reorderProjects: (ids) =>
    set((state) => {
      const byId = new Map(state.projects.map((p) => [p.project_id, p]));
      const next = ids.map((id) => byId.get(id)).filter(Boolean) as Project[];
      // keep any projects not present in ids (safety) at the end
      for (const p of state.projects) if (!ids.includes(p.project_id)) next.push(p);
      return { projects: next };
    }),
  pushAssistant: (ctx) =>
    set((s) => ({
      assistantContext: ctx,
      assistantContextNonce: s.assistantContextNonce + 1,
      assistantOpenMobile: true,
    })),
  setAssistantOpenMobile: (b) => set({ assistantOpenMobile: b }),
  setLeftContext: (c) => set({ leftContext: c }),
  newChat: () =>
    set({
      sessionId: newSessionId(),
      sessionTitle: "Neue Konversation",
      messages: [],
      guidedProject: false,
      activeProjectId: null,
    }),
}));
