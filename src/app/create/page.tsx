import Link from "next/link";
import { config } from "@/lib/config";
import { PublicCreateForm } from "@/components/PublicCreateForm";

export const dynamic = "force-static";

export const metadata = {
  title: "Shorten a link — therushabh.in",
};

export default function CreatePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-xs text-faint hover:text-body-muted">← therushabh.in</Link>
      <h1 className="mb-1 text-2xl font-bold text-heading">Shorten a link</h1>
      <p className="mb-6 text-sm text-body-muted">Free, no account needed.</p>
      <PublicCreateForm siteKey={config.turnstileSiteKey} />
    </div>
  );
}
