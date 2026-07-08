import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLinkById } from "@/lib/links";
import { getRecentClicksForLink, getTopReferrersForLink } from "@/lib/stats";
import { shortUrl } from "@/lib/config";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { EditLinkForm } from "@/components/EditLinkForm";
import { DeleteLinkButton } from "@/components/DeleteLinkButton";
import { formatDate, timeAgo } from "@/lib/format";
import { toggleDisabledAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const link = await getLinkById(id);
  if (!link) notFound();

  const [recentClicks, referrers] = await Promise.all([
    getRecentClicksForLink(id),
    getTopReferrersForLink(id),
  ]);
  const url = shortUrl(link.slug);

  return (
    <AppShell email={user.email} active="/links">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/links" className="text-sm text-body-muted hover:text-heading">← Links</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a href={url} target="_blank" rel="noreferrer" className="font-mono text-lg font-semibold text-accent hover:underline">
                {url.replace(/^https?:\/\//, "")}
              </a>
              {link.disabled ? (
                <span className="badge badge-danger">disabled</span>
              ) : (
                <span className="badge badge-success">active</span>
              )}
            </div>
            <p className="break-all text-sm text-body-muted">→ {link.destinationUrl}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={url} label="Copy link" className="btn-primary" />
              <a href={url} target="_blank" rel="noreferrer" className="btn-ghost">Open</a>
              <a href={`/api/links/${link.id}/qr`} target="_blank" rel="noreferrer" className="btn-ghost">QR PNG</a>
              <form action={toggleDisabledAction.bind(null, link.id)}>
                <button type="submit" className="btn-ghost">
                  {link.disabled ? "Enable" : "Disable"}
                </button>
              </form>
              <DeleteLinkButton id={link.id} slug={link.slug} />
            </div>
          </div>

          <EditLinkForm link={link} />
        </div>

        <div className="space-y-4">
          <div className="card grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-heading">{link.clickCount}</div>
              <div className="text-xs uppercase tracking-wide text-faint">Clicks</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-heading">{timeAgo(link.lastClickedAt)}</div>
              <div className="text-xs uppercase tracking-wide text-faint">Last click</div>
            </div>
            <div className="col-span-2 text-xs text-faint">Created {formatDate(link.createdAt)}</div>
          </div>

          <div className="card">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">QR code</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/links/${link.id}/qr`} alt={`QR for ${link.slug}`} width={160} height={160} className="rounded-xl bg-white p-2" />
          </div>

          <div className="card">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Top referrers</h3>
            <ul className="space-y-1 text-sm">
              {referrers.length === 0 && <li className="text-faint">No referrer data.</li>}
              {referrers.map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate text-body-muted">{r.referrer ?? "direct"}</span>
                  <span className="text-heading">{r.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="mb-3 text-sm font-semibold text-heading">Recent clicks</h3>
        <ul className="space-y-2 text-sm">
          {recentClicks.length === 0 && <li className="text-faint">No clicks recorded yet.</li>}
          {recentClicks.map((c) => (
            <li key={c.id} className="border-warm flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
              <span className="text-body-muted">{c.uaSummary}</span>
              <span className="text-faint">{c.country ?? ""}</span>
              <span className="truncate text-faint">{c.referrer ?? "direct"}</span>
              <span className="text-faint" title={formatDate(c.ts)}>{timeAgo(c.ts)}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
