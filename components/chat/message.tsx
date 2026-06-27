"use client";

import { useState } from "react";
import { Message } from "@/lib/api";
import { timeStr } from "@/lib/utils";

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[uh])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

interface Props {
  message: Message;
  onChoiceSelect?: (choice: string) => void;
}

export function ChatMessage({ message, onChoiceSelect }: Props) {
  const [choicePicked, setChoicePicked] = useState<string | null>(null);
  const isUser = message.role === "user";

  // Extract choices block
  let content = message.content;
  let choices: string[] = [];
  const choiceMatch = content.match(/\[\[CHOICES:\s*([\s\S]*?)\]\]/i);
  if (choiceMatch) {
    choices = choiceMatch[1].split("|").map(s => s.trim()).filter(Boolean);
    content = content.replace(choiceMatch[0], "").trim();
  }

  function handleChoice(c: string) {
    if (choicePicked) return;
    setChoicePicked(c);
    onChoiceSelect?.(c);
  }

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-serif shrink-0 mt-0.5"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}>A</div>
      )}
      <div className={`max-w-[75%] space-y-3 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{isUser ? "Du" : "BI Agent"}</span>
          <span className="text-[10px] text-muted-foreground">{timeStr()}</span>
        </div>
        {/* Content */}
        <div className={`prose-chat text-sm leading-relaxed ${
          isUser
            ? "bg-muted px-4 py-2.5 rounded-2xl rounded-tr-sm text-foreground"
            : "text-foreground"
        }`}>
          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
        </div>
        {/* Choice chips */}
        {choices.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {choices.map(c => (
                <button key={c} onClick={() => handleChoice(c)} disabled={!!choicePicked}
                  className={`choice-chip text-xs ${choicePicked === c ? "chosen" : ""}`}>
                  {c}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Wähle eine Option oder schreib unten deine eigene Antwort.
            </p>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-foreground text-background shrink-0 mt-0.5">U</div>
      )}
    </div>
  );
}

export function ThinkingMessage({ phase }: { phase: string }) {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-serif shrink-0 mt-0.5"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}>A</div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">BI Agent</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="thinking-spinner" />
          <span className="text-sm text-muted-foreground italic">{phase}</span>
        </div>
      </div>
    </div>
  );
}
