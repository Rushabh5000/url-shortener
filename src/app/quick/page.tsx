import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

// Deliberately lightweight: single big input, add-to-home-screen friendly,
// the fastest possible path to a short link on your phone.
export default async function QuickPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { url } = await searchParams;

  return (
    <AppShell email={user.email} active="/quick">
      <div className="mx-auto flex max-w-md flex-col justify-center pb-24 pt-8">
        <p className="mb-4 text-2xl font-bold text-heading">Shorten a link</p>
        <CreateLinkForm variant="quick" initialUrl={url ?? ""} />
      </div>
    </AppShell>
  );
}
