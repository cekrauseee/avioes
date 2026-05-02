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
processed_ops (id text pk)
```

`identity` and `theme` are Postgres enums. `ts` is epoch milliseconds (matches the `AirplaneEvent` shape used by `lib/streaks.ts`).

All DB access goes through `src/lib/store.ts`:

- `readEvents()` — every event, ordered by `ts`. Used by diary and scoreboard.
- `counts()` — `{ henrique, pietra }` totals via `SELECT count(*) GROUP BY who`. Used by the counter (avoids loading every row just to count).
- `applyEvents(ops)` — transactionally applies validated queue ops and records `processed_ops.id` so retries are idempotent.
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
- `syncEvents(ops)` — read `ap_id`, validate queue op shape, `applyEvents(ops)`, `revalidatePath` + `refresh()` when anything lands. Returns `{ acked, my, total }` so the client can drop only landed/rejected ops and pin the counter during refresh. Used for both online taps and draining the offline queue.
- `setTheme(theme)` — read `ap_id`; bail if missing. `writeTheme(who, theme)`. `revalidatePath("/", "layout")` so the root layout re-renders with the new `data-theme`.

Server Components never call `cookies().set` directly and never write to the DB — only Server Actions do.

## Client interactivity

- The counter is offline-tolerant. Taps and undos go to a localStorage write-ahead queue (`src/lib/offline-queue.ts`) first; the displayed count is `serverCount + deltaFor(queue, who)`. A shared sync loop calls `syncEvents(queue)` and drops acked ids — triggered on mount, queue mutation, `online`, `visibilitychange→visible`, and a short retry interval while offline/unconfirmed. Per-user undo cancels the most recent pending `add` for the user locally; otherwise it enqueues an `undo` op that replays as "delete that user's latest event". `canUndo` is `display > 0`.
- The big counter number animates with `useSpring` from Motion.
- The plane arc is a `motion.div` containing `✈`, mounted into a small array in client state and trimmed back after the animation finishes.
- The theme toggle is a small client component that calls `setTheme` and lets the root layout re-render. The theme is applied on the server via `<html data-theme={theme}>`, so there is no FOUC. While there is no identity yet (onboarding), theme is `'system'`.

## PWA

- `app/manifest.ts` is a Next.js metadata route emitting `/manifest.webmanifest`.
- The service worker is served by a route handler at `src/app/sw.js/route.ts` (URL `/sw.js`). The handler templates the SW JS with a `CACHE` constant tied to Next's build id (`.next/BUILD_ID`, with a `dev-${Date.now()}` fallback for local dev). Each deploy therefore gets a unique `CACHE` value, the install/activate handlers wipe caches that don't match, and clients update automatically — no manual version bump per deploy. The SW precaches only public metadata on install, then caches identity-gated HTML/RSC routes after real navigation or successful sync. Offline _writes_ are not handled by the SW — the counter's localStorage queue covers that (no Background Sync API). Do **not** add a `public/sw.js`; a static file at the same path would override the route handler and break the per-deploy versioning.
- `app/components/pwa-register.tsx` registers the SW on mount, only in production.
- Icons are PNGs in `public/icons/` and referenced by `app/manifest.ts`.

## Why this shape

- Two hardcoded users → no auth surface, no account flows. The cookie is just a per-device "which of us is this".
- Postgres for shared state → events and theme follow the user across devices. Switching from cookie storage also lifted the prior 1000-event cap.
- Drizzle + `db:push` → schema is the source of truth, no migration files to manage. Fine for two users; revisit if the model gets non-trivial.
- Server Actions for writes → no API endpoints to design, mutations stay colocated with the action.
- Async `cookies()` (Next 16) → all cookie helpers are `async`. Don't try to read cookies synchronously.
