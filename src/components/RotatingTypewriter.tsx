"use client";

import { useEffect, useState } from "react";

interface RotatingTypewriterProps {
  phrases: string[];
  speed?: number;
  eraseSpeed?: number;
  pause?: number;
  onPhraseTyped?: () => void;
  onPhraseErased?: () => void;
}

/** Types each phrase in, pauses, erases it, then moves to the next — looping forever. */
export function RotatingTypewriter({
  phrases,
  speed = 30,
  eraseSpeed = 16,
  pause = 1300,
  onPhraseTyped,
  onPhraseErased,
}: RotatingTypewriterProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    let pIndex = 0;

    function schedule(fn: () => void, ms: number) {
      setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    }

    function typePhrase() {
      const full = phrases[pIndex];
      let i = 0;
      function tick() {
        if (cancelled) return;
        setText(full.slice(0, i));
        i++;
        if (i <= full.length) {
          schedule(tick, speed);
        } else {
          onPhraseTyped?.();
          schedule(erasePhrase, pause);
        }
      }
      tick();
    }

    function erasePhrase() {
      const full = phrases[pIndex];
      let i = full.length;
      function tick() {
        if (cancelled) return;
        setText(full.slice(0, i));
        i--;
        if (i >= 0) {
          schedule(tick, eraseSpeed);
        } else {
          onPhraseErased?.();
          pIndex = (pIndex + 1) % phrases.length;
          schedule(typePhrase, 250);
        }
      }
      tick();
    }

    typePhrase();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases]);

  return <>{text}</>;
}
