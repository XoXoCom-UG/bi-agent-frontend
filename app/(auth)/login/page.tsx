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
      else router.push("/chat");
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
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "2rem", justifyContent: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--accent)", color: "var(--on-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 18, fontFamily: "Georgia, serif",
          }}>B</div>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>BI Agent</span>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg2)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "1.5rem",
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex", gap: 4, background: "var(--panel)",
            padding: 4, borderRadius: 10, marginBottom: "1.5rem",
          }}>
            {(["login", "signup"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "6px 0", fontSize: 13, fontWeight: 500,
                borderRadius: 7, border: "none", cursor: "pointer", transition: "all 0.15s",
                fontFamily: "inherit",
                background: tab === t ? "var(--bg)" : "transparent",
                color: tab === t ? "var(--text)" : "var(--text2)",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
              }}>
                {t === "login" ? "Einloggen" : "Registrieren"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: "var(--text)" }}>
                E-Mail
              </label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%", height: 40, borderRadius: 10,
                  border: "1px solid var(--border)", background: "var(--bg)",
                  color: "var(--text)", padding: "0 12px", fontSize: 13,
                  fontFamily: "inherit", outline: "none",
                }} />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: "var(--text)" }}>
                Passwort
              </label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", height: 40, borderRadius: 10,
                  border: "1px solid var(--border)", background: "var(--bg)",
                  color: "var(--text)", padding: "0 12px", fontSize: 13,
                  fontFamily: "inherit", outline: "none",
                }} />
            </div>

            {/* Error/success message */}
            {msg && (
              <div style={{
                padding: "8px 12px", borderRadius: 8, marginBottom: "1rem",
                fontSize: 12, lineHeight: 1.5,
                background: msg.ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                color: msg.ok ? "var(--green)" : "var(--red)",
                border: `1px solid ${msg.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
              }}>
                {msg.text}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: "100%", height: 42, borderRadius: 10, border: "none",
              background: "var(--accent)", color: "var(--on-accent)",
              fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1, transition: "opacity 0.15s, transform 0.1s",
              fontFamily: "inherit",
            }}>
              {loading ? "Bitte warten…" : tab === "login" ? "Einloggen" : "Account erstellen"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: "1rem" }}>
          IT Consulting Agent · v3
        </p>
      </div>
    </div>
  );
}
