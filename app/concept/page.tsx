"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, ConceptData } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, KpiCard } from "@/components/ui";
import { cn, truncate } from "@/lib/utils";

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
  const [conceptLoading, setConceptLoading] = useState(true);

  useEffect(() => { if (!loading && !token) router.replace("/login"); }, [token, loading]);

  useEffect(() => {
    if (!token || !sessionId) return;
    setConceptLoading(true);
    api.getConcept(token, sessionId)
      .then(d => { if (d?.concept) setConcept(d.concept); })
      .catch(() => {})
      .finally(() => setConceptLoading(false));
  }, [token, sessionId]);

  async function generate() {
    if (!token) return;
    setGenerating(true); setError("");
    try {
      const msgs = store.messages;
      if (!msgs.length) {
        setError("Schreibe zuerst mit dem Agenten, dann kann ein Concept erstellt werden.");
        setGenerating(false);
        return;
      }
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
  const hasChat = store.messages.length > 0;

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="flex bg-gray-50" style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {/* Topbar */}
        <header className="flex items-center gap-3 px-5 h-14 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {concept?.title || "Transformation Concept"}
            </p>
            {concept && (
              <p className="text-xs text-gray-400">
                {steps.length} Schritte · {stories.length} User Stories
              </p>
            )}
          </div>
          {concept && <Badge variant="default">✓ Bereit</Badge>}
          {concept && (
            <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
              {generating ? "…" : "↺ Regenerieren"}
            </Button>
          )}
          <Button variant="outline" size="sm">⬇ PDF</Button>
          <Button size="sm" onClick={() => router.push(`/dashboard?session=${sessionId}`)}
            className="text-white" style={{ background: "var(--green)" }}>
            Roadmap →
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 pb-16">

            {/* Loading skeleton */}
            {conceptLoading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="grid grid-cols-4 gap-3 mt-6">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
                </div>
                <div className="h-48 bg-gray-100 rounded-xl" />
              </div>
            )}

            {/* Empty state — no concept and no chat */}
            {!conceptLoading && !concept && !hasChat && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 bg-gray-50 border border-gray-200">
                  💬
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Erst chatten, dann Concept</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-sm">
                  Das Transformation Concept wird automatisch aus deinem Chat generiert.
                  Starte zuerst ein Gespräch mit dem Agenten.
                </p>
                <Button onClick={() => router.push("/chat")} className="text-white" style={{ background: "var(--green)" }}>
                  Zum Chat →
                </Button>
              </div>
            )}

            {/* Empty state — has chat but no concept */}
            {!conceptLoading && !concept && hasChat && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 bg-amber-50 border border-amber-200">
                  ⚡
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Bereit zur Generierung</h2>
                <p className="text-sm text-gray-500 mb-2 max-w-sm">
                  Du hast {store.messages.filter(m => m.role === "user").length} Nachrichten im Chat.
                  Das Concept wird daraus automatisch erstellt.
                </p>
                <p className="text-xs text-gray-400 mb-6">Dauert ca. 15–30 Sekunden</p>
                {error && (
                  <p className="text-sm text-red-500 mb-4 max-w-sm">{error}</p>
                )}
                <Button onClick={generate} disabled={generating}
                  className="text-white" style={{ background: "var(--green)", opacity: generating ? 0.7 : 1 }}>
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <div className="thinking-spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                      Generiere Concept…
                    </span>
                  ) : "⚡ Transformation Concept generieren"}
                </Button>
              </div>
            )}

            {/* Concept content */}
            {!conceptLoading && concept && (
              <div className="space-y-5 animate-in">

                {/* Header */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--green)" }}>
                      Transformation Concept
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight mb-1">
                    {concept.title}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {steps.length} Schritte · {stories.length} User Stories · Session {sessionId?.slice(-8)}
                  </p>
                </div>

                {/* KPI Strip */}
                {(bv.manual_effort || bv.error_rate || bv.cost_savings) && (
                  <div className="grid grid-cols-4 gap-3">
                    {bv.manual_effort && <KpiCard label="Zeitersparnis" value={truncate(bv.manual_effort, 10)} sub="Manuelle Aufwände" accent="var(--green)" />}
                    {bv.error_rate && <KpiCard label="Fehlerrate" value={truncate(bv.error_rate, 10)} sub="Reduzierung" accent="#dc2626" />}
                    {bv.cost_savings && <KpiCard label="Kostenersparnis" value={truncate(bv.cost_savings, 10)} sub="Pro Jahr" accent="#1d4ed8" />}
                    <KpiCard label="Schritte" value={String(steps.length)} sub="Transformationsschritte" accent="#b45309" />
                  </div>
                )}

                {/* Ist → Ziel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ist → Ziel im Vergleich</CardTitle>
                    <Badge variant="default">{Math.max(pains.length, outcomes.length) + 1} Aspekte</Badge>
                  </CardHeader>
                  <div className="grid grid-cols-2 divide-x divide-gray-100">
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider text-red-600">Ist-Zustand</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-relaxed mb-3 pb-3 border-b border-gray-100">
                        {now.summary || "—"}
                      </p>
                      <div className="space-y-2">
                        {pains.map((p, i) => (
                          <div key={i} className="flex gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300 shrink-0 mt-1.5" />
                            <p className="text-xs text-gray-600 leading-relaxed">{p}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--green)" }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--green)" }}>Ziel-Zustand</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-relaxed mb-3 pb-3 border-b border-gray-100">
                        {goal.summary || "—"}
                      </p>
                      <div className="space-y-2">
                        {outcomes.map((o, i) => (
                          <div key={i} className="flex gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-300 shrink-0 mt-1.5" />
                            <p className="text-xs text-gray-600 leading-relaxed">{o}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Transformationsschritte</CardTitle>
                    <Badge variant="default">{steps.length} Schritte</Badge>
                  </CardHeader>
                  <div className="divide-y divide-gray-100">
                    {steps.map((s, i) => (
                      <div key={i} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "var(--green)" }}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-gray-900">{s.title}</span>
                              {s.effort && (
                                <span className="text-xs px-2 py-0.5 rounded font-mono bg-gray-100 text-gray-500 border border-gray-200">{s.effort}</span>
                              )}
                            </div>
                            {s.business_value && (
                              <p className="text-xs font-medium mb-1" style={{ color: "var(--green)" }}>
                                ↗ {s.business_value}
                              </p>
                            )}
                            {s.description && (
                              <>
                                <button onClick={() => setOpenStep(openStep === i ? null : i)}
                                  className="text-xs font-medium mt-1 transition-colors"
                                  style={{ color: "var(--green)", background: "none", border: "none", cursor: "pointer" }}>
                                  {openStep === i ? "▾ Details ausblenden" : "▸ Details anzeigen"}
                                </button>
                                {openStep === i && (
                                  <div className="mt-3 p-3 rounded-lg bg-gray-50 animate-in">
                                    <p className="text-xs text-gray-600 leading-relaxed mb-2">{s.description}</p>
                                    {s.implementation_ideas?.length ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {s.implementation_ideas.map((idea, j) => (
                                          <span key={j} className="text-xs px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600">{idea}</span>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* User Stories */}
                {stories.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>User Stories</CardTitle>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">Product Owner</Badge>
                    </CardHeader>
                    <div className="divide-y divide-gray-100">
                      {stories.map((s, i) => (
                        <div key={i} className="p-4 flex gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-amber-50 text-amber-700 border border-amber-200">
                            {s.size || "M"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-1">{s.title}</p>
                            <p className="text-xs text-gray-600 leading-relaxed mb-1.5">{s.story}</p>
                            {s.acceptance_criteria && (
                              <p className="text-xs font-medium" style={{ color: "var(--green)" }}>
                                ✓ {s.acceptance_criteria}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Business Value */}
                {(bv.manual_effort || bv.error_rate || bv.cost_savings) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Business Value</CardTitle>
                      <Badge variant="default">ROI-Übersicht</Badge>
                    </CardHeader>
                    <div className="grid grid-cols-3 divide-x divide-gray-100">
                      {[
                        { label: "Zeitersparnis", val: bv.manual_effort, sub: "Manuelle Aufwände", bg: "bg-green-50", tc: "text-green-700", border: "border-green-200" },
                        { label: "Fehlerrate", val: bv.error_rate, sub: "Reduzierung", bg: "bg-red-50", tc: "text-red-600", border: "border-red-200" },
                        { label: "Kostenersparnis", val: bv.cost_savings, sub: "Pro Jahr", bg: "bg-blue-50", tc: "text-blue-700", border: "border-blue-200" },
                      ].filter(x => x.val).map(x => (
                        <div key={x.label} className={cn("p-5", x.bg)}>
                          <p className={cn("text-xs font-bold uppercase tracking-wider mb-2 opacity-70", x.tc)}>{x.label}</p>
                          <p className={cn("text-xl font-extrabold leading-none mb-1.5 tracking-tight", x.tc)}>{truncate(x.val, 20)}</p>
                          <p className="text-xs text-gray-500">{x.sub}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
      </div>
    }>
      <ConceptContent />
    </Suspense>
  );
}
