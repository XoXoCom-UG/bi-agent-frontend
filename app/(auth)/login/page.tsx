"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: error.message, ok: false });
      else router.push("/");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg({ text: error.message, ok: false });
      else {
        setMsg({ text: "Account erstellt — bitte einloggen.", ok: true });
        setTab("login");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg font-serif"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
            B
          </div>
          <span className="text-lg font-semibold tracking-tight">BI Agent</span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg mb-6">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                {t === "login" ? "Einloggen" : "Registrieren"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-Mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm 
                           text-foreground placeholder:text-muted-foreground
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="name@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Passwort</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm
                           text-foreground placeholder:text-muted-foreground
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="••••••••" />
            </div>

            {msg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                {msg.text}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-10 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              {loading ? "Bitte warten…" : tab === "login" ? "Einloggen" : "Account erstellen"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          IT Consulting Agent · v3
        </p>
      </div>
    </div>
  );
}
