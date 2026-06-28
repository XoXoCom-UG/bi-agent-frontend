"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/lib/chat-store";
import { api, DeckRow, RoadmapData } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageSquare, Zap, Map, ArrowLeft, RefreshCw, ArrowRight, CheckCircle2, ThumbsUp, AlertTriangle, Info } from "lucide-react";

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

  function verdictStyle(v: string) {
    const l = v?.toLowerCase() ?? "";
    if (l.includes("empf")) return { dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200" };
    if (l.includes("vorsicht") || l.includes("nicht")) return { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" };
    return { dot: "bg-blue-400", badge: "bg-blue-50 text-blue-700 border-blue-200" };
  }

  if (loading || !token) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="thinking-spinner" style={{ width: 24, height: 24 }} />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar currentPath="/dashboard" />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Topbar */}
        <div className="h-14 bg-white border-b border-zinc-200 flex items-center px-6 gap-3 flex-shrink-0">
          <h1 className="text-sm font-semibold text-zinc-900">Roadmap</h1>
        </div>

        {/* Deck content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-1">Deck</h2>
              <p className="text-sm text-zinc-500">Alle Konversationen auf einen Blick. Öffne Research, Concept oder Roadmap.</p>
            </div>

            {/* Loading */}
            {deckLoading && (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-zinc-200 rounded-xl h-[88px] animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!deckLoading && deck.length === 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl shadow-sm px-10 py-16 text-center">
                <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 mb-2">Noch keine Konversationen</h3>
                <p className="text-sm text-zinc-500 mb-5">Starte einen Chat und komm dann hierher zurück.</p>
                <button
                  onClick={() => router.push("/chat")}
                  className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 active:scale-[0.98] rounded-lg px-5 py-2.5"
                >
                  Chat starten
                </button>
              </div>
            )}

            {/* Deck rows */}
            <div className="flex flex-col gap-2.5">
              {deck.map((row, i) => (
                <div
                  key={row.session_id}
                  className="deck-card bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Card header */}
                  <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate mb-0.5">
                        {row.title || "Konversation"}
                      </h3>
                      <p className="text-xs text-zinc-400 font-mono">
                        {row.message_count} Nachrichten · {new Date(row.saved_at).toLocaleDateString("de", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    {row.has_concept && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" strokeWidth={2} />
                        Concept
                      </span>
                    )}
                  </div>

                  {/* Card actions */}
                  <div className="px-4 pb-3 flex items-center gap-2 border-t border-zinc-100 pt-2.5">
                    <button
                      onClick={() => { store.setSessionId(row.session_id); router.push("/chat"); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors duration-150 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 active:scale-[0.98]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Chat öffnen
                    </button>
                    <button
                      onClick={() => router.push(`/concept?session=${row.session_id}`)}
                      className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors duration-150 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 active:scale-[0.98]"
                    >
                      <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Transformation Concept
                      {row.has_concept && <CheckCircle2 className="w-3 h-3 text-green-500" strokeWidth={2} />}
                    </button>
                    {row.has_concept ? (
                      <button
                        onClick={() => openRoadmap(row.session_id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-150 active:scale-[0.98] rounded-lg px-3 py-1.5 ml-auto"
                      >
                        <Map className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Roadmap öffnen
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 border border-zinc-100 rounded-lg px-3 py-1.5 ml-auto cursor-not-allowed"
                      >
                        <Map className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Roadmap
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Roadmap overlay — positioned inside main, covers only content area */}
        {(roadmap || rmLoading) && (
          <div className="roadmap-panel absolute inset-0 bg-zinc-50 z-20 flex flex-col overflow-hidden">

            {/* Roadmap topbar */}
            <div className="h-14 bg-white border-b border-zinc-200 flex items-center px-6 gap-3 flex-shrink-0">
              <button
                onClick={() => { setRoadmap(null); setRmSession(null); }}
                className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-150 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 active:scale-[0.98]"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                Deck
              </button>
              <h2 className="flex-1 text-sm font-semibold text-zinc-900 truncate">
                {roadmap?.title || "Roadmap"}
              </h2>
              {rmSession && (
                <button
                  onClick={() => openRoadmap(rmSession)}
                  className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-150 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 active:scale-[0.98]"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Neu generieren
                </button>
              )}
            </div>

            {/* Roadmap body */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-8">

                {/* Loading */}
                {rmLoading && (
                  <div className="text-center py-20">
                    <div className="thinking-spinner mx-auto mb-4" style={{ width: 28, height: 28 }} />
                    <p className="text-sm font-medium text-zinc-700 mb-1">KI generiert die Roadmap...</p>
                    <p className="text-xs text-zinc-400">Beim ersten Mal dauert es einen Moment.</p>
                  </div>
                )}

                {roadmap && !rmLoading && (
                  <div className="flex flex-col gap-8">

                    {/* Flow strip */}
                    {roadmap.phases && (
                      <div>
                        <p className="text-xs tracking-widest text-zinc-400 uppercase mb-3">Ablauf</p>
                        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-wrap gap-2 items-center">
                          {roadmap.phases.flatMap(ph => ph.steps).map((step, i, arr) => (
                            <span key={step.id} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5">
                                {step.title}
                              </span>
                              {i < arr.length - 1 && (
                                <ArrowRight className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" strokeWidth={1.5} />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phases */}
                    {roadmap.phases?.map((ph, pi) => (
                      <div key={pi}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono font-bold bg-zinc-900 text-white rounded-full px-2.5 py-0.5">
                            Phase {pi + 1}
                          </span>
                          <h3 className="text-base font-semibold text-zinc-900 tracking-tight">{ph.name}</h3>
                        </div>
                        {ph.goal && (
                          <p className="text-sm text-zinc-500 mb-4 ml-px">{ph.goal}</p>
                        )}

                        {/* Timeline */}
                        <div className="border-l-2 border-zinc-200 pl-5 ml-1 flex flex-col gap-3">
                          {ph.steps.map(step => (
                            <div key={step.id} className="relative">
                              {/* Timeline dot */}
                              <span className="absolute -left-[25px] top-4 w-2.5 h-2.5 rounded-full bg-green-600 border-2 border-zinc-50" />

                              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                                <div className="flex items-start gap-2 mb-3">
                                  <span className="flex-1 text-sm font-semibold text-zinc-900 leading-snug">{step.title}</span>
                                  {step.effort && (
                                    <span className="text-xs font-mono text-zinc-400 border border-zinc-200 rounded-md px-2 py-0.5 flex-shrink-0">
                                      {step.effort}
                                    </span>
                                  )}
                                </div>
                                {step.what && (
                                  <p className="text-sm text-zinc-600 leading-relaxed mb-2">{step.what}</p>
                                )}
                                {step.why && (
                                  <p className="text-xs text-zinc-400 mb-4">
                                    <span className="font-semibold text-green-600">Warum: </span>{step.why}
                                  </p>
                                )}

                                {/* Tools */}
                                {step.tools && step.tools.length > 0 && (
                                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-zinc-100">
                                    {step.tools.map(tool => {
                                      const vs = verdictStyle(tool.verdict ?? "");
                                      return (
                                        <div key={tool.name} className="bg-zinc-50 border border-zinc-100 rounded-lg p-3.5">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vs.dot}`} />
                                            <span className="text-sm font-semibold text-zinc-900 flex-1">{tool.name}</span>
                                            {tool.verdict && (
                                              <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${vs.badge}`}>
                                                {tool.verdict}
                                              </span>
                                            )}
                                          </div>
                                          {tool.why && (
                                            <p className="text-xs text-zinc-500 leading-relaxed mb-2.5">{tool.why}</p>
                                          )}
                                          {(tool.pros?.length || tool.cons?.length) && (
                                            <div className="grid grid-cols-2 gap-3">
                                              {tool.pros?.length ? (
                                                <div>
                                                  <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1.5">Dafür</p>
                                                  {tool.pros.map((p, i) => (
                                                    <p key={i} className="text-xs text-zinc-500 mb-1 leading-relaxed">· {p}</p>
                                                  ))}
                                                </div>
                                              ) : null}
                                              {tool.cons?.length ? (
                                                <div>
                                                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1.5">Dagegen</p>
                                                  {tool.cons.map((c, i) => (
                                                    <p key={i} className="text-xs text-zinc-500 mb-1 leading-relaxed">· {c}</p>
                                                  ))}
                                                </div>
                                              ) : null}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="thinking-spinner" style={{ width: 24, height: 24 }} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
