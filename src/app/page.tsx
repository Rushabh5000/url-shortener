import Link from "next/link";
import { PROJECTS } from "@/data/projects";

export const dynamic = "force-static";

// Homepage — this is what visitors to therushabh.in see.
// Left column is a placeholder pending a final design pick; right column
// (Projects) is final. Nothing here affects the shortener itself, which
// lives entirely under /dashboard, /quick, /links, /settings, /create,
// and the /:slug redirect.

function ProjectLink({ href, label, muted }: { href: string; label: string; muted?: boolean }) {
  const style = { color: muted ? "var(--text-muted)" : "var(--coral-text)" };
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="text-xs font-medium hover:underline" style={style}>
        {label} →
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-xs font-medium hover:underline" style={style}>
      {label} ↗
    </a>
  );
}

function ProjectSection({ title, items, linkKey, linkLabel, muted }: {
  title: string;
  items: typeof PROJECTS;
  linkKey: "liveUrl" | "sourceUrl";
  linkLabel: string;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-faint">{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-3 rounded-xl border-warm border bg-[var(--surface)] px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading">{p.name}</p>
              <p className="truncate text-xs text-body-muted">{p.description}</p>
            </div>
            <ProjectLink href={p[linkKey]!} label={linkLabel} muted={muted} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const live = PROJECTS.filter((p) => p.liveUrl);
  const source = PROJECTS.filter((p) => p.sourceUrl);

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-10 px-6 py-16 md:flex-row md:items-center">
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--coral-text)" }}>Hi, I&apos;m</p>
        <h1 className="mt-1 text-4xl font-bold text-heading">Rushabh</h1>
        <p className="mt-3 text-base text-body-muted">
          Building things on the internet. This is my corner of it.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <a href="https://github.com/rushabh5000" target="_blank" rel="noreferrer" className="btn-ghost">
            GitHub
          </a>
          <a href="mailto:rushabh5000@gmail.com" className="btn-ghost">
            Email
          </a>
        </div>

        <div className="mt-16">
          <Link href="/login" className="text-xs text-faint hover:text-body-muted">
            Admin
          </Link>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <ProjectSection title="Live" items={live} linkKey="liveUrl" linkLabel="Open" />
        <ProjectSection title="Source" items={source} linkKey="sourceUrl" linkLabel="GitHub" muted />
      </div>
    </div>
  );
}
