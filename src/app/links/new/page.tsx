import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { CreateLinkForm } from "@/components/CreateLinkForm";

export const dynamic = "force-dynamic";

export default async function NewLinkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell email={user.email} active="/links">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-xl font-bold text-heading">New link</h1>
        <CreateLinkForm variant="full" />
      </div>
    </AppShell>
  );
}
