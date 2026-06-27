import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(s: string | undefined, n: number) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function dateStr(d: string) {
  return new Date(d).toLocaleDateString("de", { month: "short", day: "numeric" });
}

export function newSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function timeStr(date?: string | Date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
