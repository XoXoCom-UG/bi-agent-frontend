"use client";

import { create } from "zustand";
import { Message, Session, Project } from "@/lib/api";
import { newSessionId } from "@/lib/utils";

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
  newChat: () =>
    set({
      sessionId: newSessionId(),
      sessionTitle: "Neue Konversation",
      messages: [],
      guidedProject: false,
      activeProjectId: null,
    }),
}));
