# therushabh.in — personal site + branded URL shortener

A real, self-hostable app that serves the root domain **`therushabh.in`**: a small
personal homepage at `/`, plus a full link shortener (`therushabh.in/43hjfk`) with
a dashboard, mobile quick-create, click tracking, and automation via API key or
a Telegram bot.

- **Stack:** Next.js 15 (App Router, TypeScript) · Drizzle ORM · Postgres (Neon / Vercel Postgres) · Tailwind v4
- **Auth:** single-admin credentials, scrypt-hashed, signed JWT session cookie
- **Primary quick-create:** mobile `/quick` page (PWA) + API key for iOS Shortcuts/bookmarklet
- **Telegram bot:** included (secondary). **WhatsApp:** intentionally **not** included.
- **YOURLS:** not used — this is a custom app you fully own.
- **Free hosting:** Vercel (app) + Vercel Postgres / Neon (database), both free tiers. Docker/VPS path also included.
- **Domain:** root domain, not a subdomain — `/` is your homepage, `/dashboard` etc. is the admin UI,
  and any other path is treated as a short-link slug. See [Root-domain routing](#root-domain-routing) below.

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local            # then edit secrets (Windows: copy .env.example .env.local)
# Set DATABASE_URL in .env.local to a real Postgres connection string first (see Environment below)
npm run db:init                        # create tables
npm run create-admin -- you@example.com "your-password"
npm run dev                            # http://localhost:3000
```

Open http://localhost:3000 to see the homepage. Sign in at `/login` → create a
link. Visiting `http://localhost:3000/<slug>` redirects and logs a click.

## Root-domain routing

Next.js resolves real pages before falling through to the `/[slug]` catch-all
redirect handler, so `/about`, `/dashboard`, `/login`, etc. always win over a
short link with the same name — there's no ambiguity. [`src/lib/slug.ts`](src/lib/slug.ts)
keeps a `RESERVED` set of every path the app owns, plus common personal-site
sections (`about`, `projects`, `resume`, `blog`, `contact`, …) as placeholders.
**Whenever you add a new top-level page to the site, add its path to `RESERVED`**
so the admin UI clearly rejects a shortcode that would collide with it, instead
of silently creating a short link nothing can ever reach.

The homepage itself is [`src/app/page.tsx`](src/app/page.tsx) — a minimal
placeholder (name, tagline, a couple of links). Edit it freely; nothing about
the shortener depends on its contents.

## Environment

See [`.env.example`](.env.example). Database connection string comes from Neon
(directly, or via Vercel's Postgres integration — same thing under the hood).
Generate other secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"   # IP_HASH_SALT
```

## Routes

| Route | What it does |
| --- | --- |
| `/` | personal homepage (public) |
| `/login` | admin sign-in |
| `/dashboard` | stats: totals, clicks today, top links, recent clicks, 14-day chart |
| `/links` · `/links/new` · `/links/[id]` | list/search · create · edit/analytics/QR/delete |
| `/quick` | mobile-first one-field create (add to home screen) |
| `/settings` | API keys, bookmarklet, Telegram, CSV export, password |
| `/:slug` | public redirect (+ async click logging) |
| `POST/GET /api/links` | create / list (session **or** `x-api-key`) |
| `PATCH/DELETE /api/links/[id]` | edit / delete |
| `GET /api/links/[id]/qr` | QR PNG/SVG |
| `GET /api/export?type=links\|clicks` | CSV export |
| `POST /api/telegram` | Telegram webhook |
| `GET /api/health` | health check |

## Create a link via API

```bash
curl -X POST https://therushabh.in/api/links \
  -H "x-api-key: gsk_xxx" -H "content-type: application/json" \
  -d '{"url":"https://example.com/very/long","alias":"promo"}'
# -> { "slug":"promo", "shortUrl":"https://therushabh.in/promo", ... }
```

Create an API key in **Settings**. Great for iOS Shortcuts / the bookmarklet.

## Import legacy links

```bash
npm run import -- --file examples/legacy-links.csv --dry-run   # preview
npm run import -- --file examples/legacy-links.csv             # commit
npm run import -- --file examples/legacy-links.json
```

Skips invalid URLs and duplicate slugs, preserves provided slugs, generates the rest.

---

## Deploy — Option A: Vercel + Vercel Postgres / Neon (recommended, free)

1. **Database:** In the Vercel dashboard, open your project → **Storage** tab →
   **Create Database** → **Neon (Serverless Postgres)**. This auto-injects
   `DATABASE_URL` (and a few related vars) into your project's environment —
   no separate account or manual connection-string wiring needed.
2. **Pull the connection string down locally** and create the schema:
   ```bash
   vercel env pull .env.local          # pulls DATABASE_URL etc. from Vercel
   npm run db:init
   npm run create-admin -- you@example.com "pw"
   ```
3. **Vercel:** import the repo (if not already), set the remaining env vars
   (`PUBLIC_BASE_URL=https://therushabh.in`, `SESSION_SECRET`, `IP_HASH_SALT`, …), deploy.
4. **Domain / DNS (apex/root domain — different from a subdomain):** a root domain
   can't use a `CNAME` record (that's a DNS-protocol rule). In Vercel, add domain
   `therushabh.in`; it will tell you to add an **A record**: `@` → `76.76.21.21`
   (Vercel's anycast IP — use the exact value Vercel shows you). Optionally also
   add `www.therushabh.in` as a CNAME to the apex, and let Vercel redirect it. HTTPS
   is automatic either way.

## Deploy — Option B: VPS + Docker + Caddy

Same Postgres database (Neon) as above — Docker just runs the app itself, not the DB.

1. DNS: **A** record `@` (root) → your server IP. Optionally `www` → same IP.
2. `.env` with `DATABASE_URL` (same Neon connection string), `PUBLIC_BASE_URL=https://therushabh.in`, and other secrets.
3. ```bash
   docker compose up -d --build
   docker compose exec app npm run create-admin -- you@example.com "password"
   ```
   Caddy fetches TLS automatically for both `therushabh.in` and `www.therushabh.in`.

## Telegram bot (optional)

1. `@BotFather` → new bot → set `TELEGRAM_BOT_TOKEN`.
2. `@userinfobot` → your numeric id → set `TELEGRAM_ALLOWED_CHAT_IDS`.
3. Set `TELEGRAM_WEBHOOK_SECRET` (any random string), deploy, then:
   ```bash
   npm run set-telegram-webhook -- https://therushabh.in
   ```
4. DM the bot a URL → get a short link. `https://x.com/... myalias` sets a custom alias.

## Security notes

- Only `http`/`https` destinations; `javascript:`/`data:`/`file:` and loopback hosts rejected.
- Session cookie is httpOnly + SameSite=Lax; mutations also check the `Origin` header (CSRF).
- API keys are stored as SHA-256 hashes (raw shown once). Passwords use scrypt.
- Basic in-memory rate limiting on login and link creation.
- Reserved paths (`api`, `login`, `dashboard`, personal-site sections, …) can't be used as slugs.
- All admin actions are written to an audit log.

## Notes on choices

- **Postgres via Neon** keeps ops trivial and free at personal-project volume, and is a first-class
  Vercel storage integration — one dashboard, one less account to separately manage.
- **`next/server` `after()`** logs clicks after the redirect is sent, so redirects stay instant.
- **Root domain over a subdomain**: since Next.js always prefers a real page over the
  `/[slug]` catch-all, hosting both the personal site and the shortener in one app on
  the apex domain is safe as long as `RESERVED` is kept in sync with real pages.
