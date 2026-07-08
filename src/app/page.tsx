import Link from "next/link";

export const dynamic = "force-static";

// Placeholder personal homepage — this is what visitors to rushabh.in see.
// Edit freely; the shortener lives entirely under /dashboard, /quick, /links,
// /settings and the /:slug redirect, so nothing here affects it.
export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
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
  );
}
