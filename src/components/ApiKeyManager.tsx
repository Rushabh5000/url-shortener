"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | number | null;
  disabled: boolean;
}

export function ApiKeyManager({ initialKeys }: { initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create key");
        return;
      }
      setFreshKey(data.key);
      setKeys((k) => [
        { id: data.id, name: data.name, prefix: data.key.slice(0, 12), lastUsedAt: null, disabled: false },
        ...k,
      ]);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Anything using it will stop working.")) return;
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) setKeys((k) => k.filter((row) => row.id !== id));
  }

  return (
    <div className="space-y-4">
      {error && <p className="badge-danger !rounded-xl px-3 py-2 text-sm font-normal">{error}</p>}

      {freshKey && (
        <div className="rounded-2xl p-3" style={{ background: "var(--amber-soft)" }}>
          <p className="mb-2 text-xs" style={{ color: "var(--amber-text)" }}>
            Copy this now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-warm-code px-2 py-1.5 text-xs">{freshKey}</code>
            <CopyButton text={freshKey} className="btn-ghost !py-1.5 text-xs" />
          </div>
        </div>
      )}

      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. iOS Shortcut)"
          className="input"
          required
        />
        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? "…" : "Create"}
        </button>
      </form>

      <ul className="space-y-2">
        {keys.length === 0 && <li className="text-sm text-faint">No API keys yet.</li>}
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between gap-3 rounded-xl border-warm border px-3 py-2 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium text-heading">{k.name}</div>
              <div className="font-mono text-xs text-faint">{k.prefix}…</div>
            </div>
            <button type="button" onClick={() => revoke(k.id)} className="btn-ghost !py-1 text-xs">Revoke</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
