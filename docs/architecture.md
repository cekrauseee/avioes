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
│         │                                ┌──────────────┐   │
│         │  Server Components render with │ cookies()    │   │
│         │  identity (cookie) + DB reads  │   +          │   │
│         │                                │ Postgres     │   │
│         └────────────────────────────────┴──────────────┘   │
└────────────────────────────────────────────────────────────┘
```

There are two hardcoded users (`henrique`, `pietra`). There is no auth and no signup. Identity is just a per-device cookie that says which of the two is currently using this device.

State that should survive across devices (airplane events, theme preference) lives in Postgres, keyed by `who`.

## Data layer

### Cookie

| Cookie  | Shape                      | Read by                | Written by                     |
| ------- | -------------------------- | ---------------------- | ------------------------------ |
| `ap_id` | `"henrique"` \| `"pietra"` | every Server Component | `setIdentity`, `clearIdentity` |

`ap_id` is `sameSite=lax`, `path=/`, `maxAge=1y`. It's the only cookie the app uses.

### Postgres (Drizzle)

Schema in `src/lib/db/schema.ts`:

```ts
events       (id serial pk, who identity, ts bigint)
preferences  (who identity pk, theme theme default 'system')
```

`identity` and `theme` are Postgres enums. `ts` is epoch milliseconds (matches the `AirplaneEvent` shape used by `lib/streaks.ts`).

All DB access goes through `src/lib/store.ts`:

- `readEvents()` — every event, ordered by `ts`. Used by diary and scoreboard.
- `counts()` — `{ henrique, pietra }` totals via `SELECT count(*) GROUP BY who`. Used by the counter (avoids loading every row just to count).
- `addEvent(who)` — `INSERT` one row.
- `deleteLastEvent(who)` — deletes the most recent event for `who`. Per-user, not global, so undoing only removes your own taps.
- `readTheme(who | null)` — returns `'system'` when `who` is null (no identity yet).
- `writeTheme(who, theme)` — upsert on `preferences.who`.

`src/lib/db/index.ts` is the driver switch. It picks `drizzle-orm/neon-serverless` when `process.env.VERCEL === '1'` (or `DRIZZLE_DRIVER=neon`) and `drizzle-orm/node-postgres` otherwise. Both read `DATABASE_URL`.

### Derived data

- **Streaks** — `computeStreaks(events)` in `lib/streaks.ts` collapses consecutive same-`who` events into `{ who, count, startTs, endTs }`. Used by `/diary` and `/scoreboard`.
- **Totals** — for the counter, prefer `counts()` from `store.ts` (cheap aggregate). For pages that already need the full event list (`/diary`, `/scoreboard`), `totals(events)` from `streaks.ts` re-derives them client-side without a second query.

## Routing

App Router, all routes are dynamic (cookie + DB reads opt out of static rendering):

- `/` — gate. Reads `ap_id`. Missing → renders `<Onboarding/>`. Present → fetches `counts()` + theme and renders `<Counter/>` inside `<AppShell/>`.
- `/diary` — reads `ap_id` (redirect to `/` if missing), `readEvents()`, `readTheme(who)`. Computes streaks, renders timeline.
- `/scoreboard` — same pattern. Totals + recent streaks.

There is no route group. `<AppShell/>` is a regular component used by counter, diary, and scoreboard. Onboarding is rendered without the shell (no nav).

## Server Actions

All mutations go through `src/actions.ts`:

- `setIdentity(who)` — write `ap_id`, `redirect("/")`.
- `clearIdentity()` — delete `ap_id`, `redirect("/")`.
- `addAirplane()` — read `ap_id`, `addEvent(who)`, `revalidatePath` for `/`, `/diary`, `/scoreboard`.
- `undoLast()` — read `ap_id`, `deleteLastEvent(who)` (per-user). Same revalidation.
- `setTheme(theme)` — read `ap_id`; bail if missing. `writeTheme(who, theme)`. `revalidatePath("/", "layout")` so the root layout re-renders with the new `data-theme`.

Server Components never call `cookies().set` directly and never write to the DB — only Server Actions do.

## Client interactivity

- The counter uses `useOptimistic` for the per-person count and the global total. Taps update optimistically inside `startTransition`, then `addAirplane()` runs and the server response replaces the optimistic value. `canUndo` is `myCount > 0` (per-user) — you cannot undo someone else's tap.
- The big counter number animates with `useSpring` from Motion.
- The plane arc is a `motion.div` containing `✈`, mounted into a small array in client state and trimmed back after the animation finishes.
- The theme toggle is a small client component that calls `setTheme` and lets the root layout re-render. The theme is applied on the server via `<html data-theme={theme}>`, so there is no FOUC. While there is no identity yet (onboarding), theme is `'system'`.

## PWA

- `app/manifest.ts` is a Next.js metadata route emitting `/manifest.webmanifest`.
- `public/sw.js` is a minimal service worker: precaches the shell on install, network-first for same-origin GETs, falls back to `/` on offline. Bump the `CACHE` constant when shell URLs change.
- `app/components/pwa-register.tsx` registers the SW on mount, only in production.
- Icons are placeholder SVGs in `public/icons/`. PNGs should replace them before public release.

## Why this shape

- Two hardcoded users → no auth surface, no account flows. The cookie is just a per-device "which of us is this".
- Postgres for shared state → events and theme follow the user across devices. Switching from cookie storage also lifted the prior 1000-event cap.
- Drizzle + `db:push` → schema is the source of truth, no migration files to manage. Fine for two users; revisit if the model gets non-trivial.
- Server Actions for writes → no API endpoints to design, mutations stay colocated with the action.
- Async `cookies()` (Next 16) → all cookie helpers are `async`. Don't try to read cookies synchronously.
