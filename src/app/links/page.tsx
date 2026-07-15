import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isPublicSubmission, listLinks, type SortColumn, type SortDir, type SortKey } from "@/lib/links";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { shortUrl } from "@/lib/config";
import { formatDate, prettyUrl, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNS: Array<{ key: SortColumn; label: string; defaultDir: SortDir; className?: string }> = [
  { key: "slug", label: "Short", defaultDir: "asc" },
  { key: "destination", label: "Destination", defaultDir: "asc" },
  { key: "clicks", label: "Clicks", defaultDir: "desc", className: "text-right" },
  { key: "created", label: "Created", defaultDir: "desc", className: "hidden sm:table-cell" },
  { key: "lastClick", label: "Last click", defaultDir: "desc", className: "hidden md:table-cell" },
];

function SortHeader({
  column,
  label,
  defaultDir,
  className,
  q,
  activeColumn,
  activeDir,
}: {
  column: SortColumn;
  label: string;
  defaultDir: SortDir;
  className?: string;
  q?: string;
  activeColumn: SortColumn;
  activeDir: SortDir;
}) {
  const isActive = column === activeColumn;
  const nextDir: SortDir = isActive ? (activeDir === "asc" ? "desc" : "asc") : defaultDir;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("sort", `${column}-${nextDir}`);

  return (
    <th className={`px-4 py-3 ${className ?? ""}`}>
      <Link href={`/links?${params.toString()}`} className="inline-flex items-center gap-1 hover:text-heading">
        {label}
        <span className={isActive ? "text-accent" : "text-faint"}>
          {isActive ? (activeDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, sort: rawSort } = await searchParams;
  const [rawColumn, rawDir] = (rawSort ?? "created-desc").split("-");
  const activeColumn: SortColumn = COLUMNS.some((c) => c.key === rawColumn) ? (rawColumn as SortColumn) : "created";
  const activeDir: SortDir = rawDir === "asc" ? "asc" : "desc";
  const sort: SortKey = `${activeColumn}-${activeDir}`;
  const links = await listLinks({ q, sort });

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
        <input type="hidden" name="sort" value={sort} />
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
                {COLUMNS.map((col) => (
                  <SortHeader
                    key={col.key}
                    column={col.key}
                    label={col.label}
                    defaultDir={col.defaultDir}
                    className={col.className}
                    q={q}
                    activeColumn={activeColumn}
                    activeDir={activeDir}
                  />
                ))}
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
                    {isPublicSubmission(l.createdBy) && (
                      <span className="badge ml-2" style={{ background: "var(--amber-soft)", color: "var(--amber-text)" }}>
                        public
                      </span>
                    )}
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
