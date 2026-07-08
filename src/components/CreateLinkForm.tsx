"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CopyButton } from "./CopyButton";

interface Result {
  id: string;
  slug: string;
  shortUrl: string;
  destinationUrl: string;
  reused: boolean;
}

export function CreateLinkForm({
  variant = "full",
  initialUrl = "",
}: {
  variant?: "full" | "quick";
  initialUrl?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      url: String(form.get("url") || ""),
      alias: String(form.get("alias") || "") || undefined,
      title: String(form.get("title") || "") || undefined,
      tags: String(form.get("tags") || "") || undefined,
      notes: String(form.get("notes") || "") || undefined,
    };

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create link");
        return;
      }
      setResult(data);
      formRef.current?.reset();
      setShowMore(false);
      router.refresh(); // keep dashboard/list counts fresh
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} onSubmit={submit} className="card space-y-4">
        {error && (
          <p className="badge-danger w-full !rounded-xl px-3 py-2 text-sm font-normal">
            {error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="url">Long URL</label>
          <input
            id="url"
            name="url"
            type="url"
            inputMode="url"
            autoFocus
            required
            defaultValue={initialUrl}
            placeholder="https://example.com/some/very/long/link"
            className={`input ${variant === "quick" ? "py-3.5 text-base" : ""}`}
          />
        </div>

        <div>
          <label className="label" htmlFor="alias">Custom alias (optional)</label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-faint">rushabh.in/</span>
            <input id="alias" name="alias" placeholder="auto" className="input" />
          </div>
        </div>

        {variant === "full" || showMore ? (
          <>
            <div>
              <label className="label" htmlFor="title">Title (optional)</label>
              <input id="title" name="title" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="tags">Tags (comma separated)</label>
              <input id="tags" name="tags" placeholder="work, promo" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" name="notes" rows={2} className="input" />
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setShowMore(true)} className="text-xs text-body-muted hover:text-heading">
            + Add title / tags / notes
          </button>
        )}

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
          <div className="flex flex-wrap gap-2">
            <CopyButton text={result.shortUrl} label="Copy link" className="btn-primary" />
            <a href={result.shortUrl} target="_blank" rel="noreferrer" className="btn-ghost">Open</a>
            <a href={`/api/links/${result.id}/qr`} target="_blank" rel="noreferrer" className="btn-ghost">QR code</a>
            <a href={`/links/${result.id}`} className="btn-ghost">Manage</a>
          </div>
        </div>
      )}
    </div>
  );
}
