# Airplanes

A two-person airplane-spotting counter, built as a private game between Henrique and Pietra. Tap once for every airplane you see in the sky together — the app keeps a shared running tally, a diary of streaks, and a scoreboard. The UI is in Brazilian Portuguese (the visible PWA name is "Aviões"); the codebase, project name, and infrastructure are in English.

## What this is

- A small, installable PWA. Two hardcoded users: Henrique and Pietra.
- No login. Identity is picked once per device during onboarding and stored in an httpOnly cookie (`ap_id`); the browser keeps only a last-known display hint for offline boot.
- Airplane events and per-user theme live in Postgres so they follow the user across devices. The PWA also keeps an IndexedDB snapshot and ordered pending-op queue for offline use.
- UI is in Brazilian Portuguese; the codebase, docs, and identifiers are in English.

The aesthetic is intentionally small, organic and journal-like — see [`docs/ui-ux.md`](./docs/ui-ux.md).

## Stack

- Next.js 16 (App Router, Turbopack, async `cookies()`)
- React 19 (Server Components for shells, Client Components for the offline store)
- Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline`)
- Motion (framer-motion v12) for the counter spring + plane arc
- Postgres + Drizzle ORM (`node-postgres` locally, `@neondatabase/serverless` on Vercel)

## Getting started

```bash
npm install
npm run db:up               # docker compose up -d → Postgres on :5432
cp .env.example .env.local
npm run db:push             # apply Drizzle schema
npm run dev
```

Open <http://localhost:3000>. The first visit shows the onboarding screen.

## Scripts

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Dev server with Turbopack                   |
| `npm run build`     | Production build                            |
| `npm run start`     | Run the production build locally            |
| `npm run lint`      | ESLint (flat config, `eslint-config-next`)  |
| `npm run test`      | Vitest unit tests                           |
| `npm run db:up`     | Start the local Postgres container          |
| `npm run db:down`   | Stop and remove the container + volume      |
| `npm run db:push`   | Sync `src/lib/db/schema.ts` to the database |
| `npm run db:studio` | Browse rows in Drizzle Studio               |

The service worker only registers in production builds. Run `npm run build && npm run start` to test the PWA install flow.

## Project layout

```
src/
  app/
    page.tsx              counter shell
    diary/page.tsx        diary shell
    scoreboard/page.tsx   scoreboard shell
    manifest.ts           PWA manifest (metadata route)
    sw.js/route.ts        versioned service worker
  actions.ts              server actions (cookie + sync transport)
  components/             UI components
  lib/
    cookies.ts            identity cookie helpers
    offline-db.ts         IndexedDB + boot cache persistence
    offline-model.ts      deterministic offline projections
    offline-store.ts      React external store + sync loop
    store.ts              DB-backed canonical state + op replay
    streaks.ts            event → streak derivation
    types.ts              shared types + IDENTITIES map
    db/
      index.ts            driver switch (pg ↔ neon-serverless)
      schema.ts           Drizzle schema
public/
  icons/                  PWA PNG icons
docker-compose.yaml       local Postgres
drizzle.config.ts         drizzle-kit config
docs/                     project documentation (start here)
```

## Documentation

The `docs/` folder is the source of truth for how this project is designed and built. Start with [`docs/project.md`](./docs/project.md), then read whichever doc matches what you're about to do:

- [`docs/project.md`](./docs/project.md) — what the app is and what it isn't
- [`docs/architecture.md`](./docs/architecture.md) — how the app is wired together
- [`docs/code-style.md`](./docs/code-style.md) — conventions for writing code in this repo
- [`docs/ui-ux.md`](./docs/ui-ux.md) — design language, palette, typography, motion
- [`docs/context.md`](./docs/context.md) — running implementation log (kept up to date)
- [`docs/backlog.md`](./docs/backlog.md) — known deferred follow-ups

If you are an AI agent picking up this project, read [`AGENTS.md`](./AGENTS.md) first.
