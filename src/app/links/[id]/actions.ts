"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { deleteLink, getLinkById, updateLink } from "@/lib/links";
import { writeAudit } from "@/lib/audit";

// Server Actions include built-in CSRF (Origin) protection; we still re-check auth.

export async function toggleDisabledAction(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const link = await getLinkById(id);
  if (!link) throw new Error("Link not found");

  await updateLink(id, { disabled: !link.disabled });
  await writeAudit({
    actor: session.email,
    action: link.disabled ? "link.enable" : "link.disable",
    target: link.slug,
  });
  revalidatePath(`/links/${id}`);
  revalidatePath("/links");
}

export async function deleteLinkAction(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const link = await getLinkById(id);
  if (!link) throw new Error("Link not found");

  await deleteLink(id);
  await writeAudit({ actor: session.email, action: "link.delete", target: link.slug });
  revalidatePath("/links");
  redirect("/links");
}
