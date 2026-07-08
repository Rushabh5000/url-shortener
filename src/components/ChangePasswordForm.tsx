"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(form.get("currentPassword") || ""),
          newPassword: String(form.get("newPassword") || ""),
        }),
      });
      const data = await res.json();
      setMsg(
        res.ok
          ? { ok: true, text: "Password updated ✓" }
          : { ok: false, text: data.error ?? "Failed" },
      );
      if (res.ok) (e.target as HTMLFormElement).reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {msg && (
        <p className={`!rounded-xl px-3 py-2 text-sm font-normal ${msg.ok ? "badge-success" : "badge-danger"}`}>
          {msg.text}
        </p>
      )}
      <div>
        <label className="label" htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="newPassword">New password</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" className="input" minLength={8} required />
      </div>
      <button type="submit" className="btn-ghost" disabled={saving}>
        {saving ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
