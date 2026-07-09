"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { CopyButton } from "./CopyButton";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

interface Result {
  slug: string;
  shortUrl: string;
  reused: boolean;
}

export function PublicCreateForm({ siteKey }: { siteKey: string }) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function renderWidget() {
    if (!window.turnstile || !widgetRef.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: siteKey,
      callback: (token) => setCaptchaToken(token),
      "error-callback": () => setCaptchaToken(null),
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!captchaToken) {
      setError("Please complete the verification challenge.");
      return;
    }

    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/public/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: String(form.get("url") || ""), captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create link");
        window.turnstile?.reset(widgetId.current ?? undefined);
        setCaptchaToken(null);
        return;
      }
      setResult(data);
      (e.target as HTMLFormElement).reset();
      window.turnstile?.reset(widgetId.current ?? undefined);
      setCaptchaToken(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!siteKey) {
    return (
      <p className="card text-sm text-body-muted">
        Public link creation isn&apos;t configured yet — check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />

      <form onSubmit={submit} className="card space-y-4">
        {error && (
          <p className="badge-danger w-full !rounded-xl px-3 py-2 text-sm font-normal">{error}</p>
        )}

        <div>
          <label className="label" htmlFor="url">Long URL</label>
          <input
            id="url"
            name="url"
            type="url"
            inputMode="url"
            required
            placeholder="https://example.com/some/very/long/link"
            className="input py-3.5 text-base"
          />
        </div>

        <div ref={widgetRef} />

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : "Shorten"}
        </button>
      </form>

      {result && (
        <div className="card space-y-3" style={{ background: "var(--coral-soft)", borderColor: "var(--border-strong)" }}>
          {result.reused && (
            <p className="badge text-xs" style={{ background: "var(--amber-soft)", color: "var(--amber-text)" }}>
              A link for that URL already existed — reusing it.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-lg font-semibold hover:underline"
              style={{ color: "var(--coral-text)" }}
            >
              {result.shortUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
          <CopyButton text={result.shortUrl} label="Copy link" className="btn-primary" />
        </div>
      )}
    </div>
  );
}
