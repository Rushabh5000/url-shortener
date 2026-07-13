"use client";

import { useState } from "react";
import { RotatingTypewriter } from "./RotatingTypewriter";

const TAGLINES = ["I build software", "I ship products", "I solve problems", "I write clean code"];

export function HeroPanel({ projectLinks }: { projectLinks: string[] }) {
  const [underlineFull, setUnderlineFull] = useState(false);

  return (
    <div className="space-y-6">
      <div
        className="flex w-full items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-xs text-heading"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <span aria-hidden="true" className="shrink-0" style={{ color: "var(--text-muted)" }}>🔒</span>
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">
          <RotatingTypewriter phrases={projectLinks} />
          <span style={{ color: "var(--coral)" }}>|</span>
        </span>
      </div>

      <p
        className="relative inline-block whitespace-nowrap"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "var(--text-primary)",
          fontSize: "1.5rem",
          lineHeight: "2rem",
          height: "2rem",
        }}
      >
        <RotatingTypewriter
          phrases={TAGLINES}
          onPhraseTyped={() => setUnderlineFull(true)}
          onPhraseErased={() => setUnderlineFull(false)}
        />
        <span
          className="absolute left-0 -bottom-1 h-1.5 rounded"
          style={{
            background: "var(--coral)",
            opacity: 0.5,
            width: underlineFull ? "100%" : "0%",
            transition: "width 0.4s ease",
          }}
        />
      </p>
    </div>
  );
}
