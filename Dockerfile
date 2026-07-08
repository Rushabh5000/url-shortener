# Simple, robust image for self-hosting on a VPS.
# (For the recommended free path — Vercel + Vercel Postgres (Neon) — you don't need Docker at all.)

FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder so `next build` can construct the DB client without a real
# connection (no query runs at build time). Overridden by the real
# DATABASE_URL at container runtime via docker-compose's env_file.
ENV DATABASE_URL=postgres://placeholder:placeholder@localhost:5432/placeholder

# ── deps ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# ── build ─────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── run ───────────────────────────────────────────────────────
FROM base AS run
ENV NODE_ENV=production
# Bring the whole built app (incl. node_modules) so `db:init` and `next start` work.
COPY --from=build /app ./
EXPOSE 3000
# Ensure the schema exists, then start the server.
CMD ["sh", "-c", "node scripts/bootstrap-db.mjs && npm run start"]
