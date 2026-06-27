"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, ConceptData } from "@/lib/api";

function ConceptContent() {
  const { token, loading } = useAuth();
  const store = useChatStore();
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session") || store.sessionId;
  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [openStep, setOpenStep] = useState<number | null>(0);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);

  useEffect(() => {
    if (!token || !sessionId) return;
    api.getConcept(token, sessionId).then(d => { if (d?.concept) setConcept(d.concept); }).catch(() => {});
  }, [token, sessionId]);

  async function generate() {
    if (!token) return;
    setGenerating(true); setError("");
    try {
      const msgs = store.messages.length > 0 ? store.messages : [];
      if (msgs.length === 0) { setError("Schreibe zuerst mit dem Agenten, dann kann ein Concept erstellt werden."); setGenerating(false); return; }
      const res = await api.generateConcept(token, { messages: msgs, session_id: sessionId });
      setConcept(res.concept);
      await api.saveConcept(token, res.session_id, res.concept);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setGenerating(false); }
  }

  const steps = concept?.transformation_steps ?? [];
  const stories = concept?.user_stories ?? [];
  const bv = concept?.business_value_summary ?? {};
  const now = concept?.now ?? {};
  const goal = concept?.goal ?? {};
  const pains = now.pain_points ?? [];
  const outcomes = goal.outcomes ?? [];

  const S = {
    page: { background: "var(--bg)", minHeight: "100vh" } as React.CSSProperties,
    nav: { height: 52, background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, position: "sticky" as const, top: 0, zIndex: 10 },
    back: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 } as React.CSSProperties,
    btn: (primary: boolean) => ({ padding: "6px 14px", borderRadius: 8, border: primary ? "none" : "1px solid var(--border)", background: primary ? "var(--green)" : "#fff", color: primary ? "#fff" : "var(--text-2)", fontSize: 12, fontWeight: primary ? 600 : 500, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties),
    body: { maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" },
    kpi: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 },
    kpiCard: (c: string) => ({ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", borderTop: `3px solid ${c}` } as React.CSSProperties),
    kpiLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--text-3)", marginBottom: 6 },
    card: { background: "#fff", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 16 } as React.CSSProperties,
    cardHead: { padding: "14px 20px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" },
    sLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-3)" },
    tag: (c: string, bg: string) => ({ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", padding: "3px 9px", borderRadius: 20, background: bg, color: c } as React.CSSProperties),
  };

  if (loading || !token) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div className="thinking-spinner" style={{ width: 24, height: 24 }} /></div>;

  return (
    <div style={S.page}>
      <div style={S.nav}>
        <button style={S.back} onClick={() => router.push("/chat")}>← Chat</button>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          {concept?.title || "Transformation Concept"}
        </span>
        {concept && <span style={S.tag("var(--green-dark)", "var(--green-light)")}>✓ Bereit</span>}
        <button style={S.btn(false)}>✎ Bearbeiten</button>
        <button style={S.btn(false)}>⬇ PDF</button>
        <button style={S.btn(true)} onClick={() => router.push(`/dashboard?session=${sessionId}`)}>Roadmap öffnen →</button>
      </div>

      <div style={S.body}>
        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--green)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
            Transformation Concept
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 6 }}>{concept?.title || "Noch kein Concept generiert"}</h1>
          {concept && <p style={{ fontSize: 13, color: "var(--text-3)" }}>{steps.length} Schritte · {stories.length} User Stories · Erstellt für Session {sessionId?.slice(-8)}</p>}
        </div>

        {/* Empty state */}
        {!concept && (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>Concept noch nicht generiert</h3>
            <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>Führe zuerst ein Gespräch mit dem Agenten, dann kann das Transformation Concept automatisch erstellt werden.</p>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</p>}
            <button onClick={generate} disabled={generating} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "var(--green)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: generating ? 0.7 : 1 }}>
              {generating ? "Generiere…" : "⚡ Concept generieren"}
            </button>
          </div>
        )}

        {concept && (
          <>
            {/* KPI Strip */}
            {(bv.manual_effort || bv.error_rate || bv.cost_savings) && (
              <div style={S.kpi}>
                {bv.manual_effort && <div style={S.kpiCard("var(--green)")}><div style={S.kpiLabel}>Zeitersparnis</div><div style={{ fontSize: 28, fontWeight: 800, color: "var(--green-dark)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{bv.manual_effort}</div><div style={{ fontSize: 11, color: "var(--text-3)" }}>Manuelle Aufwände</div></div>}
                {bv.error_rate && <div style={S.kpiCard("var(--red)")}><div style={S.kpiLabel}>Fehlerrate</div><div style={{ fontSize: 28, fontWeight: 800, color: "var(--red)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{bv.error_rate}</div><div style={{ fontSize: 11, color: "var(--text-3)" }}>Reduzierung</div></div>}
                {bv.cost_savings && <div style={S.kpiCard("var(--blue)")}><div style={S.kpiLabel}>Kostenersparnis</div><div style={{ fontSize: 28, fontWeight: 800, color: "var(--blue)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{bv.cost_savings}</div><div style={{ fontSize: 11, color: "var(--text-3)" }}>Pro Jahr</div></div>}
                <div style={S.kpiCard("var(--amber)")}><div style={S.kpiLabel}>Schritte</div><div style={{ fontSize: 28, fontWeight: 800, color: "var(--amber)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{steps.length}</div><div style={{ fontSize: 11, color: "var(--text-3)" }}>Transformationsschritte</div></div>
              </div>
            )}

            {/* Ist/Ziel */}
            <div style={S.card}>
              <div style={S.cardHead}><span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Ist → Ziel im Vergleich</span><span style={S.tag("var(--green-dark)", "var(--green-light)")}>{Math.max(pains.length, outcomes.length) + 1} Aspekte</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr" }}>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--red)", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", display: "inline-block" }}></span>Ist-Zustand</div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55, fontWeight: 500, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--bg)" }}>{now.summary || "—"}</p>
                  {pains.map((p, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fca5a5", flexShrink: 0, marginTop: 5 }}></span><span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{p}</span></div>)}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--border-2)", background: "var(--bg)" }}>→</div>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--green)", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }}></span>Ziel-Zustand</div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55, fontWeight: 500, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--bg)" }}>{goal.summary || "—"}</p>
                  {outcomes.map((o, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#86efac", flexShrink: 0, marginTop: 5 }}></span><span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{o}</span></div>)}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div style={S.card}>
              <div style={S.cardHead}><span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Transformationsschritte</span><span style={S.tag("var(--green-dark)", "var(--green-light)")}>{steps.length} Schritte</span></div>
              <div style={{ padding: "12px 16px" }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, paddingBottom: 10, borderBottom: i < steps.length - 1 ? "1px solid var(--bg)" : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--green)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                      {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--border)", minHeight: 16 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>{s.title}</span>
                        {s.effort && <span style={{ fontSize: 10, fontFamily: "monospace", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", color: "var(--text-3)" }}>{s.effort}</span>}
                        {s.business_value && <span style={{ fontSize: 10, color: "var(--green-dark)", background: "var(--green-light)", border: "1px solid var(--green-mid)", borderRadius: 20, padding: "2px 9px", fontWeight: 500 }}>↗ {s.business_value}</span>}
                      </div>
                      {s.description && (
                        <div>
                          <button onClick={() => setOpenStep(openStep === i ? null : i)} style={{ fontSize: 11, color: "var(--green)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                            {openStep === i ? "▾ Details" : "▸ Details"}
                          </button>
                          {openStep === i && (
                            <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--bg)", borderRadius: 8 }}>
                              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: s.implementation_ideas?.length ? 8 : 0 }}>{s.description}</p>
                              {s.implementation_ideas?.length ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                  {s.implementation_ideas.map((idea, j) => <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "#fff", border: "1px solid var(--border)", color: "var(--text-2)" }}>{idea}</span>)}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Stories */}
            {stories.length > 0 && (
              <div style={S.card}>
                <div style={S.cardHead}><span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>User Stories</span><span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: "var(--amber-bg)", color: "var(--amber)" }}>Product Owner</span></div>
                <div style={{ padding: "12px 16px" }}>
                  {stories.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: i < stories.length - 1 ? "1px solid var(--bg)" : "none" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--amber-bg)", border: "1px solid #fde68a", color: "var(--amber)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.size || "M"}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 4 }}>{s.story}</div>
                        {s.acceptance_criteria && <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 500 }}>✓ {s.acceptance_criteria}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Value */}
            {(bv.manual_effort || bv.error_rate || bv.cost_savings) && (
              <div style={S.card}>
                <div style={S.cardHead}><span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Business Value</span><span style={S.tag("var(--green-dark)", "var(--green-light)")}>ROI-Übersicht</span></div>
                <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Zeitersparnis", val: bv.manual_effort, sub: "Manuelle Aufwände", bg: "linear-gradient(135deg,#edf7df,#d9f0bb)", border: "#b8df7a", c: "var(--green-dark)" },
                    { label: "Fehlerrate", val: bv.error_rate, sub: "Reduzierung", bg: "linear-gradient(135deg,#fef2f2,#fee2e2)", border: "#fca5a5", c: "var(--red)" },
                    { label: "Kostenersparnis", val: bv.cost_savings, sub: "Pro Jahr", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)", border: "#93c5fd", c: "var(--blue)" },
                  ].filter(x => x.val).map(x => (
                    <div key={x.label} style={{ background: x.bg, border: `1px solid ${x.border}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: x.c, marginBottom: 6, opacity: 0.8 }}>{x.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: x.c, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4 }}>{x.val}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{x.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ConceptPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="thinking-spinner" style={{ width: 24, height: 24 }} /></div>}><ConceptContent /></Suspense>;
}
