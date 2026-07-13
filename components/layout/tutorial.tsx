"use client";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useChatStore } from "@/lib/chat-store";
import { Sparkles, X, ArrowRight, Check } from "lucide-react";

/*
 * Guided onboarding tour — the assistant "coach" (right voice) narrates while a
 * spotlight highlights the matching element on the page ("klick hier"). Chapters
 * with a progress bar; a small confetti burst on each step. Delivered via the
 * assistant so it feels personal. Acceptance criteria (Patryk): only new users,
 * only first time, always ask first, restart from Settings.
 */

interface TourStep {
  target: string;               // data-tour="..." selector; "" = centered card
  chapter: string;
  title: string;
  text: string;
  goto: "/chat" | "/concept" | "/dashboard";
  advance: "weiter" | "click";  // "click" = user must click the highlighted element
}

// One forward journey: chat → (user clicks) Concept → (user clicks) Roadmap.
const STEPS: TourStep[] = [
  { target: "projekte", chapter: "Grundlagen", title: "Deine Projekte", goto: "/chat", advance: "weiter",
    text: "Hier startest du ein Projekt, wechselst zwischen Konversationen und löschst mit 15-Minuten-Undo." },
  { target: "composer", chapter: "Grundlagen", title: "Frag den Agenten", goto: "/chat", advance: "weiter",
    text: "Hier stellst du deine Frage oder startest das geführte Interview. Das ist ein echtes Beispiel-Gespräch." },
  { target: "assistant", chapter: "Assistent", title: "Dein persönlicher Assistent", goto: "/chat", advance: "weiter",
    text: "Immer an deiner Seite — frag jederzeit etwas. Tipp: markiere Text in einer Antwort, um genau darüber zu sprechen." },
  { target: "persona", chapter: "Assistent", title: "Sein Stil", goto: "/chat", advance: "weiter",
    text: "Wähle, wie er antwortet: Tier-1-Berater (klare Empfehlungen) oder Kritiker (deckt Risiken und Schwächen auf)." },
  { target: "concept", chapter: "Ergebnisse", title: "Probier es aus: Transformation Concept", goto: "/chat", advance: "click",
    text: "Klick jetzt oben auf »Transformation Concept« — du siehst sofort, was aus dem Gespräch entsteht." },
  { target: "", chapter: "Ergebnisse", title: "Dein Konzept", goto: "/concept", advance: "weiter",
    text: "Das ist ein fertiges Beispiel-Konzept: Ist-Zustand, Ziel-Zustand und Tooling als Tabellen — ganz ohne Warten." },
  { target: "roadmap", chapter: "Ergebnisse", title: "Und jetzt die Roadmap", goto: "/concept", advance: "click",
    text: "Klick oben auf »Roadmap«, um den Umsetzungsplan zu sehen." },
  { target: "", chapter: "Ergebnisse", title: "Deine Roadmap", goto: "/dashboard", advance: "weiter",
    text: "Phasen, Tools und wie alle Bausteine zusammenwirken — auch das hier ist das Beispiel." },
  { target: "profile", chapter: "Abschluss", title: "Profil & Einstellungen", goto: "/dashboard", advance: "weiter",
    text: "Hier findest du dein Profil, das Design — und kannst diese Tour jederzeit neu starten. Viel Erfolg! 🎉" },
];

const PAD = 8;

function Confetti({ seed }: { seed: number }) {
  const colors = ["#16a34a", "#22c55e", "#4ade80", "#a3e635", "#facc15"];
  // Deterministic-ish spread by index (no Math.random needed at module level).
  const parts = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const dist = 60 + (i % 4) * 22;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 20, c: colors[i % colors.length] };
  });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      {parts.map((p, i) => (
        <motion.span key={`${seed}-${i}`}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.4 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ background: p.c }} />
      ))}
    </div>
  );
}

export function TutorialOverlay() {
  const active = useChatStore(s => s.tourActive);
  const step = useChatStore(s => s.tourStep);
  const setStep = useChatStore(s => s.setTourStep);
  const endTour = useChatStore(s => s.endTour);
  const newChat = useChatStore(s => s.newChat);
  const router = useRouter();
  const pathname = usePathname();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [burst, setBurst] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cur = STEPS[step];

  // Navigate to the step's page (the tour walks chat → concept → dashboard).
  useEffect(() => {
    if (!active || !cur) return;
    if (pathname !== cur.goto) router.push(cur.goto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, cur, pathname]);

  const measure = useCallback(() => {
    if (!cur) return;
    if (!cur.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${cur.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [cur]);

  useEffect(() => {
    if (!active) return;
    measure();
    const t = setTimeout(measure, 120); // after navigation / layout settle
    const t2 = setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { clearTimeout(t); clearTimeout(t2); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [active, step, measure, pathname]);

  useEffect(() => { if (active) setBurst(b => b + 1); }, [active, step]);

  // Hands-on steps: advance when the user actually clicks the highlighted element.
  useEffect(() => {
    if (!active || !cur || cur.advance !== "click") return;
    const el = document.querySelector(`[data-tour="${cur.target}"]`);
    if (!el) return;
    const onClick = () => setTimeout(() => {
      const s = useChatStore.getState();
      if (s.tourStep >= STEPS.length - 1) finish(); else s.setTourStep(s.tourStep + 1);
    }, 0);
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, cur, pathname]);

  function finish() {
    localStorage.setItem("matfit_tour_done", "1");
    endTour();
    newChat();
    router.push("/chat");
  }
  function next() {
    if (step >= STEPS.length - 1) { finish(); return; }
    setStep(step + 1);
  }

  if (!mounted || !active || !cur) return null;

  // Tooltip placement: below the target if there's room, else above; centered if no target.
  const vh = window.innerHeight, vw = window.innerWidth;
  const cardW = 320;
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.bottom + 12;
    const above = rect.top - 12;
    const placeBelow = below + 180 < vh;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, 12), vw - cardW - 12);
    cardStyle = placeBelow
      ? { top: below, left }
      : { top: Math.max(above - 170, 12), left };
  } else {
    cardStyle = { top: vh / 2 - 90, left: vw / 2 - cardW / 2 };
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Spotlight: transparent hole over the target, dark everywhere else. */}
      {rect ? (
        <motion.div
          initial={false}
          animate={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0 }}
          className="absolute rounded-xl pointer-events-none"
          style={{ boxShadow: "0 0 0 9999px rgba(9,9,11,0.62)", outline: "2px solid rgba(34,197,94,0.9)" }}
        />
      ) : (
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(9,9,11,0.62)" }} />
      )}

      {/* Coach card (assistant voice) */}
      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
          className="absolute pointer-events-auto"
          style={{ width: cardW, ...cardStyle }}
        >
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <Confetti seed={burst} />
            {/* progress */}
            <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
              <motion.div className="h-full bg-green-500" initial={false} animate={{ width: `${progress}%` }}
                transition={{ type: "spring", duration: 0.4, bounce: 0 }} />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-green-50 dark:bg-green-950/60 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-green-600" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-green-600">{cur.chapter}</span>
                <span className="text-[10px] text-zinc-400 ml-auto">Schritt {step + 1}/{STEPS.length}</span>
                <button onClick={finish} className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">{cur.title}</h3>
              <p className="text-[12.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">{cur.text}</p>
              <div className="flex items-center justify-between">
                <button onClick={finish} className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  Überspringen
                </button>
                {cur.advance === "click" ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                    <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.1 }}>👉</motion.span>
                    Klick auf den markierten Button
                  </span>
                ) : (
                  <button onClick={next}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg px-3.5 py-2 transition-colors">
                    {step >= STEPS.length - 1 ? <>Fertig <Check className="w-3.5 h-3.5" strokeWidth={2} /></> : <>Weiter <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} /></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}

// First-run prompt: asks before starting (only if never seen).
export function TutorialPrompt() {
  const startTour = useChatStore(s => s.startTour);
  const tourActive = useChatStore(s => s.tourActive);
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("matfit_tour_done")) return;
    const t = setTimeout(() => setAsk(true), 900);
    return () => clearTimeout(t);
  }, []);

  if (tourActive || !ask) return null;

  function later() { localStorage.setItem("matfit_tour_done", "1"); setAsk(false); }
  function start() { setAsk(false); startTour(); }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="no-print fixed bottom-5 right-5 z-[90] w-[300px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl shadow-black/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950/60 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-green-600" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Willkommen bei matfit.ai!</p>
      </div>
      <p className="text-[12.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
        Soll ich dir in einer kurzen Tour zeigen, wie alles funktioniert?
      </p>
      <div className="flex items-center gap-2">
        <button onClick={start}
          className="flex-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg py-2 transition-colors">
          Ja, zeig&apos;s mir
        </button>
        <button onClick={later}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-3 py-2">
          Später
        </button>
      </div>
    </motion.div>
  );
}
