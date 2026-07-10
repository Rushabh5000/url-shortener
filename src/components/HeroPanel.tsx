"use client";

import { useState } from "react";
import { RotatingTypewriter } from "./RotatingTypewriter";

const TAGLINES = ["I build software", "I ship products", "I solve problems", "I write clean code"];

export function HeroPanel({ projectLinks }: { projectLinks: string[] }) {
  const [underlineFull, setUnderlineFull] = useState(false);

  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-xs text-heading"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>🔒</span>
        <span className="truncate">
          <RotatingTypewriter phrases={projectLinks} />
        </span>
        <span style={{ color: "var(--coral)" }}>|</span>
      </div>

      <p
        className="relative inline-block text-2xl"
        style={{ fontFamily: "var(--font-voice)", color: "var(--text-primary)" }}
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
