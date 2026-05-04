# Architecture

## High-level shape

Airplanes is offline-first in the browser. React Server Components provide static route shells; critical app state is read from a client-side store. The server is the canonical persistence and auth boundary, but network access is a sync layer, not a route-render dependency.

```
Browser local store (IndexedDB + tiny boot cache)
  ├─ canonical server snapshot: events + theme
  ├─ pending ordered ops: add, delete, set-theme
  └─ selectors: counter, diary, scoreboard

Server Actions
  ├─ read/write ap_id cookie
  ├─ bootstrap canonical snapshot
  └─ sync pending ops into Postgres
```

There are still only two hardcoded users (`henrique`, `pietra`). Future real auth/multitenancy must keep the same security boundary: local data can display a last-known actor, but server-side session context decides the real user/workspace during sync.

## Data layer

### Auth / identity boundary

| Storage            | Shape                      | Trust level                           |
| ------------------ | -------------------------- | ------------------------------------- |
| `ap_id` cookie     | `"henrique"` \| `"pietra"` | Server authority for current app      |
| local boot cache   | `{ identity, theme }`      | UI hint only; never authorization     |
| IndexedDB snapshot | events, theme, pending ops | Offline cache/queue; server validates |

`ap_id` is `sameSite=lax`, `path=/`, `maxAge=1y`, `httpOnly`, and `secure` in production. Client JS cannot read it. On startup, the client calls `bootstrapState()` when online; the server reads `ap_id` and returns the canonical snapshot.

Do not store bearer tokens in localStorage or IndexedDB. If this app later gets real users and workspaces, use a server-issued `HttpOnly Secure SameSite` session/JWT cookie. Queued offline ops must be attached to the authenticated server session on reconnect, not trusted client `userId` or `workspaceId` fields.

### Postgres (Drizzle)

Schema in `src/lib/db/schema.ts`:

```ts
events        (id serial pk, client_id text unique nullable, who identity, ts bigint)
preferences   (who identity pk, theme theme default 'system', palette palette default 'default')
processed_ops (id text pk)
```

`events.client_id` stores the offline event id for new client-created events. Legacy rows without `client_id` are exposed to the client as `server:${id}` so exact delete replay can target them.

All DB access goes through `src/lib/store.ts`:

- `readEvents()` returns all events ordered by timestamp/id.
- `readTheme(who)` returns that user's theme, defaulting to `system`.
- `applyOps(ops, who)` transactionally applies ordered pending ops and records `processed_ops.id` for idempotency.

### Client persistence

`src/lib/offline-db.ts` owns persistence:

- IndexedDB stores the durable offline snapshot and pending ops.
- localStorage key `ap_boot` stores only last-known identity/theme for fast boot and pre-paint theme selection.
- Persisted snapshots are validated before hydration. Invalid local data is ignored instead of becoming app state.
- The old localStorage `ap_queue` format is migrated into the IndexedDB op model when possible; undo ops that cannot target a visible event stay in the old queue until a later bootstrap can resolve them.

`src/lib/offline-model.ts` is pure deterministic logic:

- project pending ops over the canonical snapshot
- derive totals/streak inputs
- make add/delete/theme ops
- settle synced ops and replay remaining ops

`src/lib/offline-store.ts` wires the model to React with `useSyncExternalStore`, BroadcastChannel, IndexedDB persistence, and the sync loop.

## Routing and UI

Routes are static App Router shells:

- `/` renders `<Counter/>`
- `/diary` renders `<DiaryView/>`
- `/scoreboard` renders `<ScoreboardView/>`
- `/settings` renders `<SettingsView/>`

Each route reads the local store. If no identity is available:

- online: show onboarding picker and call `setIdentity()`
- offline: show the blocking offline identity gate

The bottom nav is client-rendered from local identity and stays mounted across route transitions. Identity switching is blocked while offline or while pending ops exist. Theme changes apply locally immediately and queue a `set-theme` op.

## Server Actions

All mutations still go through `src/actions.ts`:

- `setIdentity(who)` writes `ap_id` and returns a canonical snapshot.
- `clearIdentity()` deletes `ap_id`; local state is cleared by the caller.
- `bootstrapState()` reads `ap_id` and returns `{ identity, events, theme, settled: [] }`.
- `syncOps(ops)` validates shape, batch size, timestamps, and current cookie identity; applies ops in order; returns settled ids and the canonical snapshot.
- The client sends sync batches of up to 250 ops. Overflow stays pending locally and drains in later sync rounds; the server never settles ops it did not inspect.

The server ignores client authority claims. Add ops whose `event.who` does not match the current server identity are settled without inserting an event. Delete ops only delete rows owned by the current server identity.

## PWA

- `app/manifest.ts` emits `/manifest.webmanifest`.
- `src/app/sw.js/route.ts` serves `/sw.js` with a cache name tied to Next's build id.
- The service worker caches public metadata/offline art, `/_next/static/*`, and static shell/RSC responses for the three app routes.
- The service worker does not cache canonical data snapshots and does not own writes. Offline writes are the IndexedDB pending op queue.

## Verification

- Run `npm run db:push` after schema changes.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- For PWA/offline changes, verify with `npm run build && npm run start` on a mobile-width viewport.
