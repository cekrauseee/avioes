# Aviões

A two-person airplane-spotting counter, built as a private game between Henrique and Pietra. Tap once for every airplane you see in the sky together — the app keeps a shared running tally, a diary of streaks, and a scoreboard.

## What this is

- A small, installable PWA shared on a single device.
- No login. Identity ("Henrique" or "Pietra") is picked once during onboarding and stored in a cookie.
- All data (identity, events, theme) lives in browser cookies. There is no backend.
- UI is in Brazilian Portuguese; the codebase, docs, and identifiers are in English.

The aesthetic is intentionally small, organic and journal-like — see [`docs/ui-ux.md`](./docs/ui-ux.md).

## Stack

- Next.js 16 (App Router, Turbopack, async `cookies()`)
- React 19 (Server Components + `useOptimistic`)
- Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline`)
- Motion (framer-motion v12) for the counter spring + plane arc

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first visit shows the onboarding screen.

## Scripts

| Command         | What it does                               |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Dev server with Turbopack                  |
| `npm run build` | Production build                           |
| `npm run start` | Run the production build locally           |
| `npm run lint`  | ESLint (flat config, `eslint-config-next`) |

The service worker only registers in production builds. Run `npm run build && npm run start` to test the PWA install flow.

## Project layout

```
app/
  page.tsx              identity gate → onboarding | counter
  diary/page.tsx        streak timeline
  scoreboard/page.tsx   totals + recent streaks
  actions.ts            server actions (cookie writes)
  lib/                  cookies, streak derivation, types
  components/           UI components
  manifest.ts           PWA manifest (metadata route)
public/
  sw.js                 minimal service worker
  icons/                placeholder SVG icons
docs/                   project documentation (start here)
```

## Documentation

The `docs/` folder is the source of truth for how this project is designed and built. Start with [`docs/project.md`](./docs/project.md), then read whichever doc matches what you're about to do:

- [`docs/project.md`](./docs/project.md) — what the app is and what it isn't
- [`docs/architecture.md`](./docs/architecture.md) — how the app is wired together
- [`docs/code-style.md`](./docs/code-style.md) — conventions for writing code in this repo
- [`docs/ui-ux.md`](./docs/ui-ux.md) — design language, palette, typography, motion
- [`docs/context.md`](./docs/context.md) — running implementation log (kept up to date)

If you are an AI agent picking up this project, read [`AGENTS.md`](./AGENTS.md) first.
