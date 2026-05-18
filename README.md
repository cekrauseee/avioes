# Aviões

A small, offline-first PWA for counting airplanes together. Groups of friends tap once per sighting — the app keeps a shared tally, a diary of streaks, and a scoreboard. Built as a Turborepo monorepo with Next.js 16, React 19, and Postgres.

The UI is fully internationalized (Brazilian Portuguese default, English alongside). The visible PWA name stays "Aviões" because it is the brand.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React Server Components)
- **UI**: React 19, Tailwind CSS v4, Motion (framer-motion v12)
- **Database**: Postgres + Drizzle ORM (`node-postgres` locally, `@neondatabase/serverless` in production)
- **Auth**: better-auth (email + password, OTP, passkey, Google OAuth)
- **Offline**: IndexedDB snapshot + pending-op queue, service worker with build-versioned cache
- **Monorepo**: Turborepo + npm workspaces
- **i18n**: `t(locale, key)` / `tf(locale, key, vars)` — PT defines the key set, EN mirrors it

## Monorepo structure

```
apps/
  web/              Main PWA (Next.js, port 3000)
  backoffice/       Admin dashboard (Next.js, port 3001)

packages/
  auth/             better-auth instance, guards, cookies, email templates
  db/               Drizzle schema, store queries, migrations
  i18n/             Translation keys and helpers
  types/            Shared TypeScript types and feature flags
```

All packages are imported as `@airplanes/*` (e.g. `@airplanes/db/store`, `@airplanes/auth/guards`).

## Features

- **Multi-tenant groups** — create, join via email invite, switch between groups
- **Tap-to-count** — optimistic UI with offline support and background sync
- **Streak diary** — consecutive sightings by the same person collapse into entries
- **Scoreboard** — per-group totals, leaders, longest streaks, global ranking
- **Offline-first** — IndexedDB persistence, pending-op queue, service worker
- **PWA** — installable, auto-versioned cache tied to Next.js `BUILD_ID`
- **Theming** — light/dark mode + 6 color palettes, per-user preference
- **Auth** — email + password, email OTP, passkey (WebAuthn), Google OAuth
- **Backoffice** — admin dashboard for user and group management

## Getting started

```bash
npm install
npm run db:up               # docker compose up -d → Postgres on :5432
cp .env.example .env.local
npm run db:migrate           # apply Drizzle migrations
npm run dev                  # starts all apps via Turborepo
```

The web app opens at [localhost:3000](http://localhost:3000), backoffice at [localhost:3001](http://localhost:3001).

For a brand-new dev database, `npm run db:push` bootstraps all tables at once (local dev only — never against production).

## Scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Dev server for all apps (Turborepo)            |
| `npm run build`       | Production build for all apps                  |
| `npm run lint`        | ESLint across the monorepo                     |
| `npm run typecheck`   | TypeScript check across the monorepo           |
| `npm run test`        | Vitest unit tests                              |
| `npm run db:up`       | Start local Postgres container                 |
| `npm run db:down`     | Stop and remove container + volume             |
| `npm run db:generate` | Generate Drizzle migration from schema changes |
| `npm run db:migrate`  | Apply pending migrations                       |
| `npm run db:push`     | Sync schema to DB (local dev bootstrap only)   |
| `npm run db:studio`   | Browse rows in Drizzle Studio                  |

## Documentation

Detailed documentation lives in `docs/`:

- [`docs/project.md`](./docs/project.md) — what the app is and what it isn't
- [`docs/architecture.md`](./docs/architecture.md) — data flow, auth, routing, offline sync
- [`docs/code-style.md`](./docs/code-style.md) — conventions for writing code in this repo
- [`docs/ui-ux.md`](./docs/ui-ux.md) — design language, palette, typography, motion
- [`docs/images.md`](./docs/images.md) — illustration catalog and request workflow
- [`docs/context.md`](./docs/context.md) — running implementation log
- [`docs/backlog.md`](./docs/backlog.md) — known deferred follow-ups

For AI agents: start with [`AGENTS.md`](./AGENTS.md).
