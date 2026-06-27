"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, DeckRow, RoadmapData } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";

function DashboardContent() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const params = useSearchParams();
  const [deck, setDeck] = useState<DeckRow[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [rmSession, setRmSession] = useState<string | null>(null);
  const [rmLoading, setRmLoading] = useState(false);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  useEffect(() => {
    if (!token) return;
    api.getDeck(token, 200).then(d => { setDeck(d.deck); setDeckLoading(false); }).catch(() => setDeckLoading(false));
  }, [token]);

  useEffect(() => {
    const s = params.get("session");
    if (s && token) openRoadmap(s);
  }, [params, token]);

  async function openRoadmap(sid: string) {
    setRmSession(sid); setRmLoading(true); setRoadmap(null);
    try { const d = await api.generateRoadmap(token!, sid); setRoadmap(d.roadmap); } catch {} finally { setRmLoading(false); }
  }

  const S = {
    page: { display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" } as React.CSSProperties,
    main: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
    topbar: { height: 52, background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 },
    content: { flex: 1, overflowY: "auto" as const, padding: "24px 24px" },
    card: { background: "#fff", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 12, overflow: "hidden" } as React.CSSProperties,
    btn: (p: boolean) => ({ padding: "6px 13px", borderRadius: 8, border: p ? "none" : "1px solid var(--border)", background: p ? "var(--green)" : "#fff", color: p ? "#fff" : "var(--text-2)", fontSize: 12, fontWeight: p ? 600 : 500, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties),
  };

  if (loading || !token) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div className="thinking-spinner" style={{ width: 24, height: 24 }} /></div>;

  return (
    <div style={S.page}>
      <Sidebar />
      <div style={S.main}>
        <div style={S.topbar}>
          <div style={{ display: "flex", gap: 2, background: "var(--bg)", padding: 3, borderRadius: 9, border: "1px solid var(--border)" }}>
            {[{ l: "Konversation", p: "/chat" }, { l: "Dashboard", p: "/dashboard" }].map(v => (
              <button key={v.p} onClick={() => router.push(v.p)}
                style={{ padding: "5px 13px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: v.p === "/dashboard" ? "#fff" : "transparent", color: v.p === "/dashboard" ? "var(--text)" : "var(--text-3)", boxShadow: v.p === "/dashboard" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                {v.l}
              </button>
            ))}
          </div>
          <h1 style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Dashboard</h1>
        </div>

        {/* Roadmap overlay */}
        {(roadmap || rmLoading) && (
          <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden", marginLeft: 220 }}>
            <div style={{ height: 52, background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
              <button style={S.btn(false)} onClick={() => { setRoadmap(null); setRmSession(null); }}>← Deck</button>
              <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{roadmap?.title || "Roadmap"}</h2>
              {rmSession && <button style={S.btn(false)} onClick={() => openRoadmap(rmSession)}>↻ Neu generieren</button>}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", maxWidth: 920, margin: "0 auto", width: "100%" }}>
              {rmLoading && (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div className="thinking-spinner" style={{ width: 28, height: 28, margin: "0 auto 14px" }} />
                  <p style={{ color: "var(--text-2)", fontSize: 14, fontWeight: 500 }}>KI generiert die Roadmap…</p>
                  <p style={{ color: "var(--text-3)", fontSize: 12, marginTop: 4 }}>Beim ersten Mal dauert es einen Moment.</p>
                </div>
              )}
              {roadmap && !rmLoading && (
                <>
                  {/* Flow */}
                  {roadmap.phases && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>Ablauf</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 16, background: "#fff", border: "1px solid var(--border)", borderRadius: 12 }}>
                        {roadmap.phases.flatMap(ph => ph.steps).map((step, i, arr) => (
                          <span key={step.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ padding: "5px 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text)" }}>{step.title}</span>
                            {i < arr.length - 1 && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Phases */}
                  {roadmap.phases?.map((ph, pi) => (
                    <div key={pi} style={{ marginBottom: 28 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", background: "var(--green)", color: "#fff", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>Phase {pi + 1}</span>
                        <span style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{ph.name}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>{ph.goal}</p>
                      <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: 20, marginLeft: 6 }}>
                        {ph.steps.map(step => (
                          <div key={step.id} style={{ position: "relative", background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginBottom: 10 }}>
                            <div style={{ position: "absolute", left: -27, top: 20, width: 10, height: 10, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 0 3px var(--bg)" }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", flex: 1 }}>{step.title}</span>
                              {step.effort && <span style={{ fontSize: 10, fontFamily: "monospace", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", color: "var(--text-3)" }}>{step.effort}</span>}
                            </div>
                            {step.what && <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 5, lineHeight: 1.55 }}>{step.what}</p>}
                            {step.why && <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}><strong style={{ color: "var(--green)" }}>Warum: </strong>{step.why}</p>}
                            {step.tools?.map(tool => {
                              const v = tool.verdict?.toLowerCase() ?? "";
                              const vc = v.includes("empf") ? "#16a34a" : v.includes("vorsicht") ? "var(--red)" : "var(--blue)";
                              const vbg = v.includes("empf") ? "#dcfce7" : v.includes("vorsicht") ? "var(--red-bg)" : "var(--blue-bg)";
                              return (
                                <div key={tool.name} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "11px 13px", marginBottom: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{tool.name}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", borderRadius: 20, background: vbg, color: vc }}>{tool.verdict}</span>
                                  </div>
                                  {tool.why && <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 7, lineHeight: 1.5 }}>{tool.why}</p>}
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    {tool.pros?.length ? <div><p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "#16a34a", marginBottom: 4, fontWeight: 700 }}>Dafür</p>{tool.pros.map((p, i) => <p key={i} style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 2 }}>· {p}</p>)}</div> : null}
                                    {tool.cons?.length ? <div><p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--red)", marginBottom: 4, fontWeight: 700 }}>Dagegen</p>{tool.cons.map((c, i) => <p key={i} style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 2 }}>· {c}</p>)}</div> : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div style={S.content}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 4 }}>Deck</h2>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>Alle Konversationen auf einen Blick. Öffne Research, Concept oder Roadmap.</p>
          </div>
          {deckLoading && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Lade…</p>}
          {!deckLoading && deck.length === 0 && (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "48px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Noch keine Konversationen</h3>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>Starte einen Chat und komm dann hierher zurück.</p>
              <button onClick={() => router.push("/chat")} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "var(--green)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Chat starten</button>
            </div>
          )}
          {deck.map(row => (
            <div key={row.session_id} style={S.card}>
              <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--bg)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3, letterSpacing: "-0.01em" }}>{row.title || "Konversation"}</h3>
                    <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace" }}>{row.message_count} Nachrichten · {new Date(row.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })}</p>
                  </div>
                  {row.has_concept && <span style={{ fontSize: 10, fontWeight: 600, background: "var(--green-light)", color: "var(--green-dark)", border: "1px solid var(--green-mid)", borderRadius: 20, padding: "2px 9px" }}>✓ Concept</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, padding: "10px 14px" }}>
                <button style={S.btn(false)} onClick={() => { store.setSessionId(row.session_id); router.push("/chat"); }}>💬 Chat öffnen</button>
                <button style={S.btn(false)} onClick={() => router.push(`/concept?session=${row.session_id}`)}>
                  ⚡ Transformation Concept {row.has_concept && "✓"}
                </button>
                {row.has_concept ? (
                  <button style={S.btn(true)} onClick={() => openRoadmap(row.session_id)}>🗺 Roadmap öffnen</button>
                ) : (
                  <button style={{ ...S.btn(false), opacity: 0.5, cursor: "not-allowed" }} disabled>🗺 Roadmap (braucht Concept)</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="thinking-spinner" style={{ width: 24, height: 24 }} /></div>}><DashboardContent /></Suspense>;
}
