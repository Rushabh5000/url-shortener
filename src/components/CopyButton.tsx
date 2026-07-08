"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className = "btn-ghost",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API needs HTTPS or localhost; ignore otherwise.
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "Copied ✓" : label}
    </button>
  );
}
