import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/links", label: "Links" },
  { href: "/quick", label: "Quick" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  email,
  active,
  children,
}: {
  email: string;
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold tracking-tight text-heading">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-xl"
              style={{ background: "var(--coral)" }}
              aria-hidden="true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1 1" />
                <path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1-1" />
              </svg>
            </span>
            therushabh.in
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active === item.href
                    ? "text-white"
                    : "text-body-muted hover:text-heading"
                }`}
                style={active === item.href ? { background: "var(--coral)" } : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-faint sm:inline">{email}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 pb-16">{children}</main>
    </div>
  );
}
