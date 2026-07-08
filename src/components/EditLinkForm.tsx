"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Link } from "@/db/schema";

export function EditLinkForm({ link }: { link: Link }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destinationUrl: String(form.get("destinationUrl") || ""),
          alias: String(form.get("alias") || ""),
          title: String(form.get("title") || ""),
          tags: String(form.get("tags") || ""),
          notes: String(form.get("notes") || ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Save failed" });
        return;
      }
      setMsg({ ok: true, text: "Saved ✓" });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <h2 className="text-sm font-semibold text-heading">Edit</h2>

      {msg && (
        <p
          className={`!rounded-xl px-3 py-2 text-sm font-normal ${
            msg.ok ? "badge-success" : "badge-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div>
        <label className="label" htmlFor="destinationUrl">Destination URL</label>
        <input id="destinationUrl" name="destinationUrl" defaultValue={link.destinationUrl} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="alias">Slug / alias</label>
        <input id="alias" name="alias" defaultValue={link.slug} className="input font-mono" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={link.title ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tags">Tags</label>
          <input id="tags" name="tags" defaultValue={link.tags ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={link.notes ?? ""} className="input" />
      </div>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
