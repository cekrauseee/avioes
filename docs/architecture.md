# Architecture

## High-level shape

```
┌────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│                                                             │
│  ┌────────────────┐    Server Action (POST)                 │
│  │ Client         │ ─────────────────────────► ┌──────────┐ │
│  │ Components     │                            │ Server   │ │
│  │ (Counter,      │ ◄───────────────────────── │ Actions  │ │
│  │  Onboarding,   │    revalidatePath          │          │ │
│  │  Nav, etc.)    │                            └─────┬────┘ │
│  └────────────────┘                                  │      │
│         ▲                                            ▼      │
│         │                                      ┌──────────┐ │
│         │  Server Components render with       │ cookies()│ │
│         │  data read from cookies              │ (async)  │ │
│         └──────────────────────────────────────┴──────────┘ │
└────────────────────────────────────────────────────────────┘
```

There is no database, no API layer, no third-party storage. The cookie _is_ the database.

## Data model

Three cookies, all `sameSite=lax`, `path=/`, `maxAge=1y`:

| Cookie      | Shape                               | Read by                    | Written by                     |
| ----------- | ----------------------------------- | -------------------------- | ------------------------------ |
| `av_id`     | `"henrique"` \| `"pietra"`          | every Server Component     | `setIdentity`, `clearIdentity` |
| `av_events` | compact CSV `h:<ts>,p:<ts>,...`     | counter, diary, scoreboard | `addAirplane`, `undoLast`      |
| `av_theme`  | `"light"` \| `"dark"` \| `"system"` | root layout                | `setTheme`                     |

The compact CSV format keeps ~500 events under the 4KB cookie limit. The events array is hard-capped at 1000 in `lib/cookies.ts`.

Derived data:

- **Streaks** — `computeStreaks(events)` in `lib/streaks.ts` collapses consecutive same-`who` events into `{ who, count, startTs, endTs }`. Used by `/diary` and `/scoreboard`.
- **Totals** — `totals(events)` returns `{ henrique, pietra }` counts. Used by counter, scoreboard.

## Routing

App Router, all routes are dynamic (cookie reads opt out of static rendering):

- `/` — gate. Reads `av_id`. Missing → renders `<Onboarding/>`. Present → renders `<Counter/>` inside `<AppShell/>`.
- `/diary` — reads `av_id` (redirect to `/` if missing) and `av_events`, computes streaks, renders timeline.
- `/scoreboard` — same pattern, renders totals + recent streaks.

There is no route group. `<AppShell/>` is a regular component used by counter, diary, and scoreboard. Onboarding is rendered without the shell (no nav).

## Server Actions

All cookie writes go through `app/actions.ts`. The actions are:

- `setIdentity(who)` — write `av_id`, `redirect("/")`.
- `clearIdentity()` — delete `av_id`, `redirect("/")`.
- `addAirplane()` — read `av_id`, append `{ who, ts: Date.now() }`, write `av_events`, `revalidatePath` for `/`, `/diary`, `/scoreboard`.
- `undoLast()` — pop the last event, same revalidation.
- `setTheme(theme)` — write `av_theme`, `revalidatePath("/", "layout")` so the root layout re-renders with the new `data-theme`.

Server Components never call `cookies().set` directly — only Server Actions and Route Handlers can.

## Client interactivity

- The counter uses `useOptimistic` for the per-person count and the global total. Taps update optimistically inside `startTransition`, then `addAirplane()` runs and the server response replaces the optimistic value.
- The big counter number animates with `useSpring` from Motion.
- The plane arc is a `motion.div` containing `✈`, mounted into a small array in client state and trimmed back after the animation finishes.
- The theme toggle is a small client component that calls `setTheme` and lets the root layout re-render. The theme is applied on the server via `<html data-theme={theme}>`, so there is no FOUC.

## PWA

- `app/manifest.ts` is a Next.js metadata route emitting `/manifest.webmanifest`.
- `public/sw.js` is a minimal service worker: precaches the shell on install, network-first for same-origin GETs, falls back to `/` on offline. Bump the `CACHE` constant when shell URLs change.
- `app/components/pwa-register.tsx` registers the SW on mount, only in production.
- Icons are placeholder SVGs in `public/icons/`. PNGs should replace them before public release.

## Why this shape

- No backend → no auth, no sync logic, no infra. Right size for two people sharing a device.
- Cookies for state → SSR can read everything on the first request. No `useEffect` loading flicker.
- Server Actions for writes → no API endpoints to design, mutations stay colocated with the action.
- Async `cookies()` (Next 16) → all cookie helpers are `async`. Don't try to read cookies synchronously.
