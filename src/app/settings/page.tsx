import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { config } from "@/lib/config";
import { AppShell } from "@/components/AppShell";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const keys = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  const keyRows = keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.getTime() : null,
    disabled: k.disabled,
  }));

  const bookmarklet =
    `javascript:(function(){window.open('${config.publicBaseUrl}/quick?url='+encodeURIComponent(location.href),'_blank');})();`;

  const curlExample = `curl -X POST ${config.publicBaseUrl}/api/links \\
  -H "x-api-key: YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{"url":"https://example.com/very/long","alias":"promo"}'`;

  return (
    <AppShell email={user.email} active="/settings">
      <h1 className="mb-6 text-xl font-bold text-heading">Settings</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-heading">API keys</h2>
          <p className="mb-4 text-xs text-faint">
            Use with iOS Shortcuts, scripts, or the bookmarklet-free API. Send as
            <code className="mx-1 rounded bg-warm-code px-1">x-api-key</code>header.
          </p>
          <ApiKeyManager initialKeys={keyRows} />
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-heading">Create via API</h2>
          <p className="mb-3 text-xs text-faint">POST to <code className="rounded bg-warm-code px-1">/api/links</code>:</p>
          <pre className="overflow-x-auto rounded-lg bg-warm-code p-3 text-xs">{curlExample}</pre>
          <div className="mt-3">
            <CopyButton text={curlExample} label="Copy curl" className="btn-ghost text-xs" />
          </div>
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-heading">Bookmarklet</h2>
          <p className="mb-3 text-xs text-faint">
            Drag this to your bookmarks bar (or save on mobile). On any page, tap it to shorten the
            current URL via the Quick page.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-warm-code px-2 py-1.5 text-xs">{bookmarklet}</code>
            <CopyButton text={bookmarklet} className="btn-ghost !py-1.5 text-xs" />
          </div>
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-heading">Telegram bot</h2>
          <p className="mb-2 text-xs text-faint">
            {config.telegramBotToken ? "Configured" : "Not configured."} Send the bot a URL to shorten it.
          </p>
          <ol className="ml-4 list-decimal space-y-1 text-xs text-body-muted">
            <li>Create a bot with @BotFather, set TELEGRAM_BOT_TOKEN.</li>
            <li>Set TELEGRAM_ALLOWED_CHAT_IDS to your chat id (@userinfobot).</li>
            <li>Run <code className="rounded bg-warm-code px-1">npm run set-telegram-webhook</code>.</li>
          </ol>
        </section>

        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-heading">Export</h2>
          <div className="flex gap-2">
            <a href="/api/export?type=links" className="btn-ghost">Links CSV</a>
            <a href="/api/export?type=clicks" className="btn-ghost">Clicks CSV</a>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-heading">Change password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </AppShell>
  );
}
