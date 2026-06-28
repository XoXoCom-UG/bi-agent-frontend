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
  const [openStep, setOpenStep] = useState<number | null>(null);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);
  useEffect(() => {
    if (!token || !sessionId) return;
    api.getConcept(token, sessionId).then(d => { if (d?.concept) setConcept(d.concept); }).catch(() => {});
  }, [token, sessionId]);

  async function generate() {
    if (!token) return;
    setGenerating(true); setError("");
    try {
      const msgs = store.messages;
      if (!msgs.length) { setError("Schreibe zuerst mit dem Agenten, dann kann ein Concept erstellt werden."); setGenerating(false); return; }
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

  if (loading || !token) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7f4" }}>
      <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 10, background: "white", borderBottom: "1px solid #e8e5e0", display: "flex", alignItems: "center", gap: 12, padding: "0 32px", height: 56 }}>
        <button onClick={() => router.push("/chat")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          ← Chat
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {concept?.title || "Transformation Concept"}
        </span>
        {concept && (
          <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>✓ Bereit</span>
        )}
        <button style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>✎ Bearbeiten</button>
        <button style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>⬇ PDF</button>
        <button onClick={() => router.push(`/dashboard?session=${sessionId}`)}
          style={{ fontSize: 13, fontWeight: 600, color: "white", background: "#16a34a", border: "none", borderRadius: 8, padding: "6px 16px", cursor: "pointer" }}>
          Roadmap →
        </button>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }}></span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#16a34a" }}>Transformation Concept</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 12px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {concept?.title || "Noch kein Concept generiert"}
          </h1>
          {concept && (
            <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>
              {steps.length} Transformationsschritte · {stories.length} User Stories
            </p>
          )}
        </div>

        {/* Empty state */}
        {!concept && (
          <div style={{ background: "white", borderRadius: 20, border: "1px solid #e8e5e0", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Noch kein Concept generiert</h3>
            <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 320, margin: "0 auto 24px" }}>
              Führe zuerst ein Gespräch mit dem Agenten, dann kann das Concept automatisch erstellt werden.
            </p>
            {error && <p style={{ fontSize: 14, color: "#dc2626", marginBottom: 16 }}>{error}</p>}
            <button onClick={generate} disabled={generating}
              style={{ fontSize: 14, fontWeight: 700, color: "white", background: generating ? "#9ca3af" : "#16a34a", border: "none", borderRadius: 12, padding: "12px 24px", cursor: generating ? "not-allowed" : "pointer" }}>
              {generating ? "Generiere…" : "⚡ Concept generieren"}
            </button>
          </div>
        )}

        {concept && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* KPI row — full text, no truncation */}
            {(bv.manual_effort || bv.error_rate || bv.cost_savings) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Zeitersparnis", val: bv.manual_effort, sub: "Manuelle Aufwände", accent: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                  { label: "Fehlerrate", val: bv.error_rate, sub: "Reduzierung", accent: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                  { label: "Kostenersparnis", val: bv.cost_savings, sub: "Pro Jahr", accent: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
                ].filter(k => k.val).map(k => (
                  <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 16, padding: "24px 20px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: k.accent, opacity: 0.8, margin: "0 0 10px" }}>{k.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: k.accent, letterSpacing: "-0.02em", margin: "0 0 6px", lineHeight: 1.2, wordBreak: "break-word" }}>{k.val}</p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{k.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ist → Ziel */}
            <div style={{ background: "white", borderRadius: 20, border: "1px solid #e8e5e0", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8e5e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Ist → Ziel</h2>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a" }}>
                  {Math.max(pains.length, outcomes.length)} Aspekte
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {/* Ist */}
                <div style={{ padding: "24px", borderRight: "1px solid #e8e5e0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", flexShrink: 0, display: "inline-block" }}></span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444" }}>Ist-Zustand</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151", margin: "0 0 20px", paddingBottom: 20, borderBottom: "1px solid #f3f4f6" }}>
                    {now.summary || "—"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pains.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fca5a5", flexShrink: 0, marginTop: 6 }}></span>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#6b7280", margin: 0 }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Ziel */}
                <div style={{ padding: "24px", background: "#fafffe" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#16a34a", flexShrink: 0, display: "inline-block" }}></span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#16a34a" }}>Ziel-Zustand</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151", margin: "0 0 20px", paddingBottom: 20, borderBottom: "1px solid #f3f4f6" }}>
                    {goal.summary || "—"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {outcomes.map((o, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86efac", flexShrink: 0, marginTop: 6 }}></span>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#6b7280", margin: 0 }}>{o}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Transformation Steps */}
            {steps.length > 0 && (
              <div style={{ background: "white", borderRadius: 20, border: "1px solid #e8e5e0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8e5e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Transformationsschritte</h2>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a" }}>{steps.length} Schritte</span>
                </div>
                <div>
                  {steps.map((s, i) => (
                    <div key={i} style={{ borderBottom: i < steps.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{s.title}</span>
                            {s.effort && (
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#f3f4f6", color: "#6b7280", fontFamily: "monospace" }}>{s.effort}</span>
                            )}
                          </div>
                          {s.business_value && (
                            <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 500, margin: "0 0 8px" }}>↗ {s.business_value}</p>
                          )}
                          {s.description && (
                            <button onClick={() => setOpenStep(openStep === i ? null : i)}
                              style={{ fontSize: 13, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}>
                              {openStep === i ? "▾ Details ausblenden" : "▸ Details anzeigen"}
                            </button>
                          )}
                          {openStep === i && (
                            <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: "#f8f7f4" }}>
                              <p style={{ fontSize: 13, lineHeight: 1.7, color: "#4b5563", margin: "0 0 12px" }}>{s.description}</p>
                              {s.implementation_ideas?.length ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                  {s.implementation_ideas.map((idea, j) => (
                                    <span key={j} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "white", border: "1px solid #e5e7eb", color: "#6b7280" }}>{idea}</span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Stories */}
            {stories.length > 0 && (
              <div style={{ background: "white", borderRadius: 20, border: "1px solid #e8e5e0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8e5e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>User Stories</h2>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>Product Owner</span>
                </div>
                <div>
                  {stories.map((s, i) => (
                    <div key={i} style={{ padding: "20px 24px", borderBottom: i < stories.length - 1 ? "1px solid #f3f4f6" : "none", display: "flex", gap: 16 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#92400e", flexShrink: 0 }}>
                        {s.size || "M"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>{s.title}</p>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#6b7280", margin: "0 0 8px" }}>{s.story}</p>
                        {s.acceptance_criteria && (
                          <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 500, margin: 0 }}>✓ {s.acceptance_criteria}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default function ConceptPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7f4" }}>
        <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
      </div>
    }>
      <ConceptContent />
    </Suspense>
  );
}
