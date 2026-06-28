"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, ConceptData } from "@/lib/api";
import { Clock, AlertTriangle, TrendingDown, Zap, ChevronDown, ChevronRight } from "lucide-react";

const KPI_META = [
  { key: "manual_effort",  label: "Zeitersparnis",   sub: "Manuelle Aufwände", Icon: Clock },
  { key: "error_rate",     label: "Fehlerrate",       sub: "Reduzierung",       Icon: AlertTriangle },
  { key: "cost_savings",   label: "Kostenersparnis",  sub: "Pro Jahr",          Icon: TrendingDown },
] as const;

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
      if (!msgs.length) {
        setError("Schreibe zuerst mit dem Agenten, dann kann ein Concept erstellt werden.");
        setGenerating(false); return;
      }
      const res = await api.generateConcept(token, { messages: msgs, session_id: sessionId });
      setConcept(res.concept);
      await api.saveConcept(token, res.session_id, res.concept);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setGenerating(false); }
  }

  const steps    = concept?.transformation_steps ?? [];
  const stories  = concept?.user_stories ?? [];
  const bv       = concept?.business_value_summary ?? {};
  const now      = concept?.now ?? {};
  const goal     = concept?.goal ?? {};
  const pains    = now.pain_points ?? [];
  const outcomes = goal.outcomes ?? [];

  const kpiItems = KPI_META
    .map(m => ({ ...m, val: (bv as Record<string, string | undefined>)[m.key] }))
    .filter(k => k.val);

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white border-b border-zinc-200 flex items-center gap-2.5 px-6 h-14">
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-150 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50"
        >
          ← Chat
        </button>
        <span className="flex-1 text-sm font-medium text-zinc-900 truncate">
          {concept?.title || "Transformation Concept"}
        </span>
        {concept && (
          <span className="text-xs text-zinc-400 hidden sm:block tracking-wide">Bereit</span>
        )}
        <button className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-150 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50">
          Bearbeiten
        </button>
        <button className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-150 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50">
          PDF
        </button>
        <button
          onClick={() => router.push(`/dashboard?session=${sessionId}`)}
          className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 rounded-lg px-4 py-1.5"
        >
          Roadmap →
        </button>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 pb-24">

        {/* Page header */}
        <div className="mb-10 pb-8 border-b border-zinc-100">
          <p className="text-xs tracking-widest text-zinc-400 uppercase mb-4">
            Transformation Concept
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">
            {concept?.title || "Noch kein Concept generiert"}
          </h1>
          {concept && (
            <p className="text-sm text-zinc-500">
              {steps.length} Transformationsschritte · {stories.length} User Stories
            </p>
          )}
        </div>

        {/* Empty state */}
        {!concept && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm px-10 py-20 text-center">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-5">
              <Zap className="w-5 h-5 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-2">Noch kein Concept generiert</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-6 leading-relaxed">
              Führe zuerst ein Gespräch mit dem Agenten, dann kann das Concept automatisch erstellt werden.
            </p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <button
              onClick={generate}
              disabled={generating}
              className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-zinc-300 transition-colors duration-150 rounded-lg px-5 py-2.5"
            >
              {generating ? "Generiere…" : "Concept generieren"}
            </button>
          </div>
        )}

        {/* Concept sections */}
        {concept && (
          <div className="flex flex-col gap-5">

            {/* KPI cards */}
            {kpiItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {kpiItems.map(({ label, val, sub, Icon }) => (
                  <div
                    key={label}
                    className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs tracking-widest text-zinc-500 uppercase">{label}</p>
                      <Icon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 tracking-tight leading-none mb-1.5 break-words">
                      {val}
                    </p>
                    <p className="text-xs text-zinc-400">{sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ist → Ziel */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">Ist → Ziel</h2>
                <span className="text-xs text-zinc-400">
                  {Math.max(pains.length, outcomes.length)} Aspekte
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* IST */}
                <div className="p-6 border-b sm:border-b-0 sm:border-r border-zinc-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0" />
                    <span className="text-xs tracking-widest text-zinc-400 uppercase">Ist-Zustand</span>
                  </div>
                  {now.summary && (
                    <p className="text-sm leading-relaxed text-zinc-500 mb-5 pb-5 border-b border-zinc-100">
                      {now.summary}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    {pains.map((p, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className="w-2 h-2 rounded-full bg-zinc-200 flex-shrink-0 mt-1.5" />
                        <p className="text-sm leading-relaxed text-zinc-500">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* ZIEL */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-zinc-700 flex-shrink-0" />
                    <span className="text-xs tracking-widest text-zinc-900 uppercase">Ziel-Zustand</span>
                  </div>
                  {goal.summary && (
                    <p className="text-sm leading-relaxed text-zinc-700 mb-5 pb-5 border-b border-zinc-100">
                      {goal.summary}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    {outcomes.map((o, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className="w-2 h-2 rounded-full bg-zinc-400 flex-shrink-0 mt-1.5" />
                        <p className="text-sm leading-relaxed text-zinc-700">{o}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Transformation Steps */}
            {steps.length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900">Transformationsschritte</h2>
                  <span className="text-xs text-zinc-400">{steps.length} Schritte</span>
                </div>
                <div>
                  {steps.map((s, i) => (
                    <div key={i} className={i < steps.length - 1 ? "border-b border-zinc-100" : ""}>
                      <div className="px-6 py-5 flex gap-4 items-start">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <span className="text-sm font-semibold text-zinc-900">{s.title}</span>
                            {s.effort && (
                              <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 font-mono">
                                {s.effort}
                              </span>
                            )}
                          </div>
                          {s.business_value && (
                            <p className="text-xs text-green-600 font-medium mb-2">{s.business_value}</p>
                          )}
                          {s.description && (
                            <button
                              onClick={() => setOpenStep(openStep === i ? null : i)}
                              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors duration-150"
                            >
                              {openStep === i
                                ? <><ChevronDown className="w-3 h-3" strokeWidth={1.5} /> Details ausblenden</>
                                : <><ChevronRight className="w-3 h-3" strokeWidth={1.5} /> Details anzeigen</>
                              }
                            </button>
                          )}
                          {openStep === i && (
                            <div className="mt-3 p-4 rounded-lg bg-zinc-50 border border-zinc-100">
                              <p className="text-sm leading-relaxed text-zinc-600 mb-3">{s.description}</p>
                              {s.implementation_ideas?.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {s.implementation_ideas.map((idea, j) => (
                                    <span key={j} className="text-xs px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-zinc-500">
                                      {idea}
                                    </span>
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
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900">User Stories</h2>
                  <span className="text-xs text-zinc-400">Product Owner</span>
                </div>
                <div>
                  {stories.map((s, i) => (
                    <div
                      key={i}
                      className={`px-6 py-5 flex gap-4 ${i < stories.length - 1 ? "border-b border-zinc-100" : ""}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 flex-shrink-0 mt-0.5">
                        {s.size || "M"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 mb-1.5">{s.title}</p>
                        <p className="text-sm leading-relaxed text-zinc-500 mb-2">{s.story}</p>
                        {s.acceptance_criteria && (
                          <p className="text-xs text-green-600 font-medium">{s.acceptance_criteria}</p>
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="thinking-spinner" style={{ width: 28, height: 28 }} />
      </div>
    }>
      <ConceptContent />
    </Suspense>
  );
}
