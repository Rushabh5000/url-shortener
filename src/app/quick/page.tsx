import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { LogoutButton } from "@/components/LogoutButton";

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="flex items-center justify-between py-5">
        <span className="text-sm font-bold text-heading">
          Quick create
        </span>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-body-muted hover:text-heading">Dashboard</Link>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center pb-24">
        <p className="mb-4 text-2xl font-bold text-heading">Shorten a link</p>
        <CreateLinkForm variant="quick" initialUrl={url ?? ""} />
      </div>
    </div>
  );
}
