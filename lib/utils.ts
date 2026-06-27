import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeStr(date?: string | Date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function dateStr(date: string) {
  return new Date(date).toLocaleDateString([], {
    month: "short", day: "numeric",
  });
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** Generate a random session-id for new chats */
export function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
