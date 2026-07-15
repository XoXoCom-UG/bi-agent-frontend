"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Landing page for the e-mail confirmation link. The Supabase browser client
// exchanges the code in the URL automatically; once a session exists we send the
// user into the app. If it doesn't appear, we fall back to the login page.
export default function AuthCallbackPage() {
  const supabase = createClient();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      const { data } = await supabase.auth.getSession();
      if (data.session) { clearInterval(iv); router.replace("/chat"); }
      else if (tries > 12) { clearInterval(iv); setFailed(true); }
    }, 400);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>matfit</span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--green)" }}>.ai</span>
        </div>
        {failed ? (
          <>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
              Bestätigung fehlgeschlagen oder Link abgelaufen.
            </p>
            <a href="/login" style={{ fontSize: 14, color: "var(--green)", textDecoration: "none", fontWeight: 600 }}>Zum Login →</a>
          </>
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-3)" }}>E-Mail wird bestätigt…</p>
        )}
      </div>
    </div>
  );
}
