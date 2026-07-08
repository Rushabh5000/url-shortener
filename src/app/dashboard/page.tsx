import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboardStats } from "@/lib/stats";
import { AppShell } from "@/components/AppShell";
import { formatDate, prettyUrl, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const TINTS = [
  { bg: "var(--coral-soft)", text: "var(--coral-text)" },
  { bg: "var(--amber-soft)", text: "var(--amber-text)" },
  { bg: "var(--pink-soft)", text: "var(--pink-text)" },
  { bg: "var(--sage-soft)", text: "var(--sage-text)" },
];

function Stat({ label, value, tint }: { label: string; value: string | number; tint: { bg: string; text: string } }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: tint.bg }}>
      <div className="text-3xl font-bold" style={{ color: tint.text }}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: tint.text }}>{label}</div>
    </div>
  );
}

function Sparkline({ daily }: { daily: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...daily.map((d) => d.count));
  return (
    <div className="card">
      <div className="mb-3 text-xs uppercase tracking-wide text-faint">Clicks · last 14 days</div>
      <div className="flex h-24 items-end gap-1">
        {daily.length === 0 && <p className="text-sm text-body-muted">No clicks yet.</p>}
        {daily.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.count}`}
            className="flex-1 rounded-t-lg"
            style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count ? "4px" : "0",
              background: "var(--coral)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stats = await getDashboardStats();

  return (
    <AppShell email={user.email} active="/dashboard">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-heading">Dashboard</h1>
        <Link href="/links/new" className="btn-primary">+ New link</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Links" value={stats.totalLinks} tint={TINTS[0]} />
        <Stat label="Total clicks" value={stats.totalClicks} tint={TINTS[1]} />
        <Stat label="Clicks today" value={stats.clicksToday} tint={TINTS[2]} />
        <Stat
          label="Avg / link"
          value={stats.totalLinks ? Math.round(stats.totalClicks / stats.totalLinks) : 0}
          tint={TINTS[3]}
        />
      </div>

      <div className="mt-4">
        <Sparkline daily={stats.daily} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-heading">Top links</h2>
          <ul className="space-y-2">
            {stats.topLinks.length === 0 && <li className="text-sm text-body-muted">Nothing yet.</li>}
            {stats.topLinks.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/links/${l.id}`} className="truncate font-mono text-accent hover:underline">
                  /{l.slug}
                </Link>
                <span className="truncate text-faint">{prettyUrl(l.destinationUrl, 28)}</span>
                <span className="shrink-0 font-semibold text-heading">{l.clickCount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-heading">Recent clicks</h2>
          <ul className="space-y-2">
            {stats.recentClicks.length === 0 && <li className="text-sm text-body-muted">Nothing yet.</li>}
            {stats.recentClicks.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono text-body-muted">/{c.slug}</span>
                <span className="truncate text-faint">{c.uaSummary}</span>
                <span className="shrink-0 text-faint" title={formatDate(c.ts)}>{timeAgo(c.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
