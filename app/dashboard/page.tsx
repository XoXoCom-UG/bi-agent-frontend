"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, DeckRow, RoadmapData } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardPage() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const [deck, setDeck] = useState<DeckRow[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [roadmapSession, setRoadmapSession] = useState<string | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);

  useEffect(() => {
    if (!token) return;
    api.getDeck(token).then(d => { setDeck(d.deck); setDeckLoading(false); }).catch(() => setDeckLoading(false));
  }, [token]);

  async function openRoadmap(sessionId: string) {
    if (!token) return;
    setRoadmapSession(sessionId);
    setRoadmapLoading(true);
    setRoadmap(null);
    try {
      const d = await api.generateRoadmap(token, sessionId);
      setRoadmap(d.roadmap);
    } catch (e) { console.error(e); }
    finally { setRoadmapLoading(false); }
  }

  const s = {
    page: { display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" } as React.CSSProperties,
    main: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
    topbar: { display: "flex", alignItems: "center", gap: 12, padding: "0 24px", height: 56, borderBottom: "1px solid var(--border)", background: "var(--bg2)", flexShrink: 0 },
    viewToggle: { display: "flex", gap: 3, background: "var(--panel)", padding: 3, borderRadius: 10 },
    viewBtn: (active: boolean) => ({ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", background: active ? "var(--bg)" : "transparent", color: active ? "var(--text)" : "var(--muted)", boxShadow: active ? "0 1px 4px rgba(0,0,0,0.2)" : "none" } as React.CSSProperties),
    content: { flex: 1, overflowY: "auto" as const, padding: "28px 28px" },
    h2: { fontSize: 24, fontWeight: 700, fontFamily: "Georgia,serif", marginBottom: 6, letterSpacing: "-0.01em" },
    subtitle: { fontSize: 13, color: "var(--text2)", marginBottom: 24 },
    card: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 12 },
    cardTitle: { fontWeight: 600, fontSize: 15, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1 },
    cardMeta: { fontSize: 11, color: "var(--muted)", fontFamily: "monospace", marginBottom: 14 },
    actions: { display: "flex", gap: 8 },
    actionBtn: (primary: boolean) => ({ padding: "7px 14px", borderRadius: 8, border: `1px solid ${primary ? "transparent" : "var(--border)"}`, background: primary ? "var(--accent)" : "transparent", color: primary ? "var(--on-accent)" : "var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" } as React.CSSProperties),
    disabledBtn: { padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "not-allowed", fontFamily: "inherit", opacity: 0.5 } as React.CSSProperties,
    overlay: { position: "fixed" as const, inset: 0, background: "var(--bg)", zIndex: 50, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  };

  if (loading || !token) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div className="thinking-spinner" /></div>;

  return (
    <div style={s.page}>
      <Sidebar onNavigate={(p) => router.push(p)} />
      <div style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div style={s.viewToggle}>
            <button style={s.viewBtn(false)} onClick={() => router.push("/chat")}>Konversation</button>
            <button style={s.viewBtn(true)}>Dashboard</button>
          </div>
          <h1 style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text2)" }}>Dashboard</h1>
        </div>

        {/* Deck */}
        <div style={s.content}>
          <h2 style={s.h2}>Deck</h2>
          <p style={s.subtitle}>Jede Karte ist eine Konversation. Öffne Research, Transformation Concept oder Roadmap.</p>

          {deckLoading && <p style={{ color: "var(--muted)", fontSize: 13 }}>Lade Deck…</p>}
          {!deckLoading && deck.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14 }}>Noch keine Konversationen. Starte einen Chat!</p>
              <button onClick={() => router.push("/chat")} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Chat starten
              </button>
            </div>
          )}

          {deck.map(row => (
            <div key={row.session_id} style={s.card}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <span style={s.cardTitle}>{row.title || "Konversation"}</span>
              </div>
              <p style={s.cardMeta}>{row.message_count} Nachrichten · {new Date(row.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })}</p>
              <div style={s.actions}>
                <button style={s.actionBtn(false)} onClick={() => { store.setSessionId(row.session_id); router.push("/chat"); }}>
                  💬 Research / Chat
                </button>
                <button style={s.actionBtn(false)} onClick={() => router.push(`/dashboard?session=${row.session_id}&view=concept`)}>
                  ⚡ Transformation Concept
                  {row.has_concept && <span style={{ marginLeft: 4, color: "var(--accent)", fontSize: 11 }}>✓</span>}
                </button>
                {row.has_concept ? (
                  <button style={s.actionBtn(true)} onClick={() => openRoadmap(row.session_id)}>
                    🗺 Roadmap öffnen
                  </button>
                ) : (
                  <button style={s.disabledBtn} disabled title="Erstelle zuerst ein Transformation Concept">
                    🗺 Roadmap (braucht Concept)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap overlay */}
      {(roadmap || roadmapLoading) && (
        <div style={s.overlay}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", flexShrink: 0 }}>
            <button onClick={() => { setRoadmap(null); setRoadmapSession(null); }}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              ← Deck
            </button>
            <h2 style={{ flex: 1, fontSize: 18, fontFamily: "Georgia,serif", fontWeight: 500 }}>
              {roadmap?.title || "Roadmap"}
            </h2>
            {roadmapSession && (
              <button onClick={() => openRoadmap(roadmapSession)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                ↻ Neu generieren
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "28px", maxWidth: 960, margin: "0 auto", width: "100%" }}>
            {roadmapLoading && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div className="thinking-spinner" style={{ margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text2)", fontSize: 13 }}>KI generiert die Roadmap…</p>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Beim ersten Mal dauert es einen Moment.</p>
              </div>
            )}

            {roadmap && !roadmapLoading && (
              <>
                {/* Flow diagram */}
                {roadmap.phases && (
                  <div style={{ marginBottom: 32 }}>
                    <p style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Ablauf</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 16, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
                      {roadmap.phases.flatMap(ph => ph.steps).map((step, i, arr) => (
                        <span key={step.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ padding: "6px 12px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text)" }}>{step.title}</span>
                          {i < arr.length - 1 && <span style={{ color: "var(--accent)", fontSize: 16 }}>→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phases */}
                <p style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>Roadmap</p>
                {roadmap.phases?.map((ph, pi) => (
                  <div key={pi} style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", background: "var(--accent)", color: "var(--on-accent)", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>Phase {pi + 1}</span>
                      <span style={{ fontSize: 20, fontFamily: "Georgia,serif" }}>{ph.name}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>{ph.goal}</p>

                    <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: 24, marginLeft: 6 }}>
                      {ph.steps.map(step => (
                        <div key={step.id} style={{ position: "relative", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
                          <div style={{ position: "absolute", left: -30, top: 22, width: 10, height: 10, borderRadius: "50%", background: "var(--accent2)", boxShadow: "0 0 0 3px var(--bg)" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{step.title}</span>
                            {step.effort && <span style={{ fontSize: 10, fontFamily: "monospace", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", color: "var(--text2)" }}>{step.effort}</span>}
                          </div>
                          {step.what && <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 6, lineHeight: 1.55 }}>{step.what}</p>}
                          {step.why && <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14, lineHeight: 1.5 }}><strong style={{ color: "var(--accent2)" }}>Warum: </strong>{step.why}</p>}

                          {step.tools && step.tools.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {step.tools.map(tool => {
                                const v = tool.verdict?.toLowerCase() ?? "";
                                const vColor = v.includes("empf") ? "#4ade80" : v.includes("vorsicht") ? "#f87171" : "#60a5fa";
                                const vBg = v.includes("empf") ? "rgba(74,222,128,0.1)" : v.includes("vorsicht") ? "rgba(248,113,113,0.1)" : "rgba(96,165,250,0.1)";
                                return (
                                  <div key={tool.name} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                      <span style={{ fontWeight: 600, fontSize: 13 }}>{tool.name}</span>
                                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 20, background: vBg, color: vColor }}>{tool.verdict}</span>
                                    </div>
                                    {tool.why && <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8, lineHeight: 1.5 }}>{tool.why}</p>}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                      {tool.pros && tool.pros.length > 0 && (
                                        <div>
                                          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4ade80", marginBottom: 4 }}>Dafür</p>
                                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                            {tool.pros.map((p, i) => <li key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 2 }}>· {p}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                      {tool.cons && tool.cons.length > 0 && (
                                        <div>
                                          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#f87171", marginBottom: 4 }}>Dagegen</p>
                                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                            {tool.cons.map((c, i) => <li key={i} style={{ fontSize: 12, color: "var(--text2)", marginBottom: 2 }}>· {c}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
    </div>
  );
}
