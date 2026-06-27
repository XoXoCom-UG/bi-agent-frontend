"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, ConceptData } from "@/lib/api";

function truncate(s: string | undefined, n: number) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

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
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--color-canvas)" }}>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-10 bg-white border-b flex items-center gap-3 px-6 h-14"
        style={{ borderColor: "var(--color-line)" }}>
        <button onClick={() => router.push("/chat")}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
          style={{ color: "var(--color-ink-2)", borderColor: "var(--color-line)", background: "white" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-brand)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-line)")}>
          ← Chat
        </button>
        <span className="flex-1 text-sm font-semibold truncate" style={{ color: "var(--color-ink)" }}>
          {concept?.title || "Transformation Concept"}
        </span>
        {concept && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "var(--color-brand-light)", color: "var(--color-brand-dark)", border: "1px solid var(--color-brand-mid)" }}>
            ✓ Bereit
          </span>
        )}
        <button className="text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
          style={{ color: "var(--color-ink-2)", borderColor: "var(--color-line)", background: "white" }}>
          ✎ Bearbeiten
        </button>
        <button className="text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
          style={{ color: "var(--color-ink-2)", borderColor: "var(--color-line)", background: "white" }}>
          ⬇ PDF
        </button>
        <button onClick={() => router.push(`/dashboard?session=${sessionId}`)}
          className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-brand)" }}>
          Roadmap →
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 pb-16">

        {/* Page header */}
        <div className="mb-8 animate-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }}></span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>Transformation Concept</span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mb-2" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em" }}>
            {concept?.title || "Noch kein Concept generiert"}
          </h1>
          {concept && (
            <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
              {steps.length} Schritte · {stories.length} User Stories
            </p>
          )}
        </div>

        {/* Empty state */}
        {!concept && (
          <div className="bg-white rounded-2xl border p-16 text-center animate-in"
            style={{ borderColor: "var(--color-line)" }}>
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-ink)" }}>Noch kein Concept generiert</h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "var(--color-ink-3)" }}>
              Führe zuerst ein Gespräch mit dem Agenten, dann kann das Concept automatisch erstellt werden.
            </p>
            {error && <p className="text-sm mb-4" style={{ color: "#dc2626" }}>{error}</p>}
            <button onClick={generate} disabled={generating}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
              style={{ background: "var(--color-brand)", opacity: generating ? 0.7 : 1 }}>
              {generating ? "Generiere…" : "⚡ Concept generieren"}
            </button>
          </div>
        )}

        {concept && (
          <div className="space-y-5 animate-in">

            {/* KPI strip — truncated values only */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Zeitersparnis", val: truncate(bv.manual_effort, 12), sub: "Manuelle Aufwände", top: "var(--color-brand)", valColor: "var(--color-brand-dark)" },
                { label: "Fehlerrate", val: truncate(bv.error_rate, 12), sub: "Reduzierung", top: "#dc2626", valColor: "#dc2626" },
                { label: "Kostenersparnis", val: truncate(bv.cost_savings, 12), sub: "Pro Jahr", top: "#1d4ed8", valColor: "#1d4ed8" },
                { label: "Schritte", val: String(steps.length), sub: "Transformationsschritte", top: "#b45309", valColor: "#b45309" },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-xl border p-4"
                  style={{ borderColor: "var(--color-line)", borderTop: `3px solid ${k.top}` }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-ink-3)" }}>{k.label}</p>
                  <p className="text-2xl font-extrabold leading-none mb-1 truncate" style={{ color: k.valColor, letterSpacing: "-0.02em" }}>{k.val}</p>
                  <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Ist → Ziel */}
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-line)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-line)" }}>
                <h2 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Ist → Ziel im Vergleich</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--color-brand-light)", color: "var(--color-brand-dark)" }}>
                  {Math.max(pains.length, outcomes.length) + 1} Aspekte
                </span>
              </div>
              <div className="grid grid-cols-2">
                {/* Ist */}
                <div className="p-5 border-r" style={{ borderColor: "var(--color-line)", background: "#fefefe" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full" style={{ background: "#dc2626", flexShrink: 0 }}></span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>Ist-Zustand</span>
                  </div>
                  <p className="text-sm font-medium mb-4 pb-4 leading-relaxed" style={{ color: "var(--color-ink)", borderBottom: "1px solid var(--color-line)" }}>
                    {now.summary || "—"}
                  </p>
                  <div className="space-y-3">
                    {pains.map((p, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#fca5a5" }}></span>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Ziel */}
                <div className="p-5" style={{ background: "#fefffe" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-brand)", flexShrink: 0 }}></span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-brand)" }}>Ziel-Zustand</span>
                  </div>
                  <p className="text-sm font-medium mb-4 pb-4 leading-relaxed" style={{ color: "var(--color-ink)", borderBottom: "1px solid var(--color-line)" }}>
                    {goal.summary || "—"}
                  </p>
                  <div className="space-y-3">
                    {outcomes.map((o, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#86efac" }}></span>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>{o}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-line)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-line)" }}>
                <h2 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Transformationsschritte</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--color-brand-light)", color: "var(--color-brand-dark)" }}>
                  {steps.length} Schritte
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--color-line)" }}>
                {steps.map((s, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "var(--color-brand)" }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{s.title}</span>
                          {s.effort && (
                            <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "var(--color-canvas)", border: "1px solid var(--color-line)", color: "var(--color-ink-3)" }}>{s.effort}</span>
                          )}
                        </div>
                        {s.business_value && (
                          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-brand)" }}>
                            ↗ {truncate(s.business_value, 80)}
                          </p>
                        )}
                        {s.description && (
                          <button onClick={() => setOpenStep(openStep === i ? null : i)}
                            className="text-xs font-medium mt-1" style={{ color: "var(--color-brand)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            {openStep === i ? "▾ Details ausblenden" : "▸ Details anzeigen"}
                          </button>
                        )}
                        {openStep === i && (
                          <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--color-canvas)" }}>
                            <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--color-ink-2)" }}>{s.description}</p>
                            {s.implementation_ideas?.length ? (
                              <div className="flex flex-wrap gap-1.5">
                                {s.implementation_ideas.map((idea, j) => (
                                  <span key={j} className="text-xs px-2 py-0.5 rounded"
                                    style={{ background: "white", border: "1px solid var(--color-line)", color: "var(--color-ink-2)" }}>{idea}</span>
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

            {/* User Stories */}
            {stories.length > 0 && (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-line)" }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-line)" }}>
                  <h2 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>User Stories</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                    Product Owner
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--color-line)" }}>
                  {stories.map((s, i) => (
                    <div key={i} className="p-4 flex gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>{s.size || "M"}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-ink)" }}>{s.title}</p>
                        <p className="text-xs leading-relaxed mb-1.5" style={{ color: "var(--color-ink-2)" }}>{s.story}</p>
                        {s.acceptance_criteria && (
                          <p className="text-xs font-medium" style={{ color: "var(--color-brand)" }}>✓ {s.acceptance_criteria}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Value */}
            {(bv.manual_effort || bv.error_rate || bv.cost_savings) && (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-line)" }}>
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-line)" }}>
                  <h2 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>Business Value</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--color-brand-light)", color: "var(--color-brand-dark)" }}>ROI-Übersicht</span>
                </div>
                <div className="grid grid-cols-3 divide-x p-0" style={{ borderColor: "var(--color-line)" }}>
                  {[
                    { label: "Zeitersparnis", val: bv.manual_effort, sub: "Manuelle Aufwände", bg: "var(--color-brand-light)", tc: "var(--color-brand-dark)", border: "var(--color-brand-mid)" },
                    { label: "Fehlerrate", val: bv.error_rate, sub: "Reduzierung", bg: "#fef2f2", tc: "#dc2626", border: "#fca5a5" },
                    { label: "Kostenersparnis", val: bv.cost_savings, sub: "Pro Jahr", bg: "#eff6ff", tc: "#1d4ed8", border: "#93c5fd" },
                  ].filter(x => x.val).map(x => (
                    <div key={x.label} className="p-5" style={{ background: x.bg, borderBottom: `3px solid ${x.border}` }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: x.tc, opacity: 0.7 }}>{x.label}</p>
                      <p className="text-xl font-extrabold leading-none mb-1.5" style={{ color: x.tc, letterSpacing: "-0.02em" }}>
                        {truncate(x.val, 20)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>{x.sub}</p>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-canvas)" }}>
        <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
      </div>
    }>
      <ConceptContent />
    </Suspense>
  );
}
