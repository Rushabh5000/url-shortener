import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listLinks } from "@/lib/links";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { shortUrl } from "@/lib/config";
import { formatDate, prettyUrl, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const links = await listLinks({ q });

  return (
    <AppShell email={user.email} active="/links">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-heading">Links</h1>
        <Link href="/links/new" className="btn-primary">+ New link</Link>
      </div>

      <form className="mb-4 flex gap-2" action="/links" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search slug, url, title, tag…"
          className="input"
        />
        <button className="btn-ghost" type="submit">Search</button>
      </form>

      <div className="card overflow-hidden p-0">
        {links.length === 0 ? (
          <p className="p-6 text-sm text-faint">
            {q ? "No links match that search." : "No links yet — create your first one."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-warm border-b text-left text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="px-4 py-3">Short</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="hidden px-4 py-3 sm:table-cell">Created</th>
                <th className="hidden px-4 py-3 md:table-cell">Last click</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-warm border-b last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3">
                    <Link href={`/links/${l.id}`} className="font-mono text-accent hover:underline">
                      /{l.slug}
                    </Link>
                    {l.disabled && <span className="badge badge-danger ml-2">disabled</span>}
                  </td>
                  <td className="px-4 py-3 text-body-muted" title={l.destinationUrl}>
                    {prettyUrl(l.destinationUrl)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-heading">{l.clickCount}</td>
                  <td className="hidden px-4 py-3 text-faint sm:table-cell">{formatDate(l.createdAt)}</td>
                  <td className="hidden px-4 py-3 text-faint md:table-cell">{timeAgo(l.lastClickedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <CopyButton text={shortUrl(l.slug)} label="Copy" className="btn-ghost !px-2.5 !py-1 text-xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
