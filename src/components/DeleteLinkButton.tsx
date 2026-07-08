"use client";

import { useTransition } from "react";
import { deleteLinkAction } from "@/app/links/[id]/actions";

export function DeleteLinkButton({ id, slug }: { id: string; slug: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Delete /${slug}? This also removes its click history and cannot be undone.`)) return;
    startTransition(() => deleteLinkAction(id));
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} className="btn-danger">
      {pending ? "Deleting…" : "Delete link"}
    </button>
  );
}
