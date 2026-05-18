# Architecture

## High-level shape

Aviões is offline-first in the browser, multi-tenant on the server. Authenticated users belong to one or more groups; counting is always scoped to the active group. React Server Components provide static route shells. Critical app state is read from a client-side store that reflects an IndexedDB snapshot of the active group. The server is the canonical persistence and security boundary — network access is a sync layer, not a route-render dependency.

```
Browser local store (IndexedDB + tiny boot cache)
  ├─ canonical server snapshot for the active group:
  │    identity, activeGroupId, groupMembers, events,
  │    theme, palette, locale
  ├─ pending ordered ops: add-event, delete-event,
  │    set-theme, set-palette, set-locale
  └─ selectors: counter, diary, scoreboard

Server
  ├─ better-auth session cookie (httpOnly)
  ├─ auth guards (packages/auth): requireUser / requireActiveGroup /
  │    requireGroupMember / requireGroupOwner
  ├─ Server Actions (apps/web): bootstrap / sync / group lifecycle /
  │    invitations / password tokens
  └─ Postgres (packages/db, Drizzle): canonical state + idempotency log
```

## Data layer

### Auth and tenancy boundary

Authentication is handled by **better-auth** with email + password, email OTP, passkey (`@better-auth/passkey`), and Google OAuth. Sessions live in an `HttpOnly Secure SameSite=Lax` cookie issued by better-auth — client JS cannot read it, and the offline store never sees it.

| Storage                | Shape                                                                            | Trust level                           |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------- |
| better-auth cookie     | session id (httpOnly, secure in prod)                                            | Server authority                      |
| `ap_boot` localStorage | `{ identity?, theme?, palette?, locale? }`                                       | UI hint only; never authorization     |
| IndexedDB snapshot     | identity, activeGroupId, groupMembers, events, theme/palette/locale, pending ops | Offline cache/queue; server validates |

Trust never crosses the boundary in the wrong direction:

- The offline store may show a last-known identity, group, palette, and locale before the network confirms anything.
- Every server action calls `auth.api.getSession({ headers: await headers() })` and re-derives membership through the helpers in `packages/auth/src/guards.ts`. Client `userId` / `groupId` claims are ignored.
- Sync ops are filtered through `isPendingOp(op, userId)` in `apps/web/src/actions.ts`: add-event ops must declare `who === server identity` and a `ts` inside the seven-day past / five-minute future window, delete-event ops only target rows owned by the caller, and `set-theme` / `set-palette` / `set-locale` are restricted to their declared enums. Invalid ops are settled-without-applying so the queue drains.
- Group reads always go through membership-scoped queries (`readGroupMembership`, `readGroupForMember`, `readGroupMembersForMember`, `readEventsForMember`). A non-member can never receive a group name, member list, or event row.
- Sensitive short-lived secrets (invitation tokens, password-create / password-change tokens) are stored hashed at rest. Plaintext exists only in the URL/email.

### Postgres (Drizzle)

Schema in `packages/db/src/schema.ts`, plus the better-auth tables in `packages/db/src/auth-schema.ts` (`users`, `sessions`, `accounts`, `verifications`, `passkeys`).

```ts
groups            (id pk, name, owner_id → users.id, created_at)
group_members     (group_id, user_id, role: owner | member, joined_at)  // pk = (group_id, user_id)
group_invitations (id pk, token unique, group_id, invited_email,
                   invited_by_user_id, status, created_at, expires_at)
                   // partial unique idx on (group_id, invited_email) where status='pending'
events            (id serial pk, client_id text unique nullable,
                   who text, group_id → groups.id, ts bigint)
preferences       (user_id pk, theme, palette, locale, active_group_id)
processed_ops     (id text pk)
```

`events.client_id` carries the offline event id for client-created events; legacy rows without one are exposed to the client as `server:${id}` so delete replay can target them. Schema changes use migrations: edit `packages/db/src/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`.

All DB access goes through `packages/db/src/store.ts`. The membership-scoped helpers fan out from there:

- `readActiveGroupId(userId)` / `writeActiveGroupId(userId, groupId | null)` — preferences row.
- `readGroupMembership(groupId, userId)` — single source of truth for "is this user in this group, and what's their role?".
- `readGroupForMember`, `readGroupMembersForMember`, `readEventsForMember`, `readGroupsForUser`, `readPendingInvitationsForGroup` — all gated by membership.
- `readTheme(userId)`, `readPalette(userId)`, `readLocale(userId)` — defaults if the row is missing.
- `applyOps(ops, userId, groupId)` transactionally applies ordered pending ops, scoped to `(userId, groupId)`, and records `processed_ops.id` for idempotency.

### Client persistence

`apps/web/src/lib/offline-db.ts` owns persistence:

- IndexedDB stores the durable offline snapshot (`identity`, `activeGroupId`, `groupMembers`, `events`, `theme`, `palette`, `locale`) and pending ops. The schema version is bumped whenever the snapshot shape changes; mismatched caches are dropped and rebootstrapped from the server.
- localStorage key `ap_boot` stores only last-known identity / theme / palette / locale for fast boot and pre-paint theme + palette + locale selection.
- Persisted snapshots are validated before hydration. Invalid local data is ignored instead of becoming app state.

`apps/web/src/lib/offline-model.ts` is pure deterministic logic:

- project pending ops over the canonical snapshot
- derive totals/streak inputs
- make add / delete / set-theme / set-palette / set-locale ops
- settle synced ops and replay remaining ops

`apps/web/src/lib/offline-store.ts` wires the model to React with `useSyncExternalStore`, BroadcastChannel (canonical snapshot hints only — pending op queues stay tab-local), IndexedDB persistence, and the sync loop.

## Routing and UI

The App Router serves these surfaces:

- `/` (`apps/web/src/app/(count)/page.tsx`) renders `<Counter/>`. Guarded by `requireActiveGroup`.
- `/diary` renders `<DiaryView/>`. Guarded by `requireActiveGroup`.
- `/scoreboard` renders `<ScoreboardView/>`. Guarded by `requireActiveGroup`.
- `/settings` renders `<SettingsView/>` (tabs: visual / group / account). Guarded by `requireActiveGroup`.
- `/settings/password`, `/settings/password/verify/[token]`, `/password/create/[token]` — magic-link password flows.
- `/groups`, `/groups/new`, `/groups/[id]/edit`, `/groups/[id]/manage` — group lifecycle. Edit/manage gated by `requireGroupOwner`; the rest by `requireUser`.
- `/auth` — unified sign-in + sign-up. Public; redirects authenticated users (`redirectAuthenticatedUser`).
- `/invite/[token]` — invitation landing page. Public; `getCurrentUser` decides what to redact.
- `/api/cron/invitations` — hourly job that bulk-expires overdue pending invites. Auth via `Authorization: Bearer ${CRON_SECRET}`.

`apps/web/src/proxy.ts` redirects unauthenticated requests for protected routes to `/auth?next=…` before render. Server page guards still re-validate the session.

The bottom nav stays mounted across route transitions and is rendered by `apps/web/src/app/layout.tsx`. Lateral navigation between tabs supports touch swipe, dominant-horizontal trackpad wheel, and unmodified Left/Right arrow keys (`apps/web/src/lib/horizontal-wheel-navigation.ts`). Theme/palette/locale changes apply locally immediately and queue a `set-theme` / `set-palette` / `set-locale` op. Switching the active group goes through `setActiveGroup` (re-checks membership server-side) and rebootstraps the snapshot.

## Server Actions

All mutations go through `apps/web/src/actions.ts`. Every action calls `getSessionUser()` first; without a session it returns an empty snapshot or a controlled error.

- `bootstrapState()` — returns `{ identity, activeGroupId, groupMembers, events, theme, palette, locale, settled: [] }` for the active group.
- `syncOps(ops)` — validates shape, batch size, timestamps, server identity, and active-group membership; applies ops in order; returns settled ids and the canonical snapshot. Batches are capped at 250 ops; overflow stays pending locally and drains in later rounds.
- `setActiveGroup(groupId)` — re-checks membership, writes `preferences.active_group_id`, returns the new snapshot.
- `getUserGroups()`, `createNewGroup`, `getGroupDetails`, `getGroupDetailsWithInvites`, `updateGroup`, `deleteGroup`, `leaveGroup`, `removeMember` — group lifecycle. Owner-only actions check `membership.role === 'owner'`.
- `createInvitation`, `acceptInvitation`, `rejectInvitation`, `cancelInvitation` — invitation flow. Tokens stored as SHA-256 hashes; per-owner rate limit (10/hour) enforced inside the creation transaction with `pg_advisory_xact_lock`. Accept/reject require `user.emailVerified` and an exact email match (case-insensitive).
- `emailExists`, `userHasPassword`, `checkUserHasPasskey`, `getEmailAuthState` — auth-screen step decisions.
- `requestPasswordChange`, `requestPasswordCreation`, `requestPasswordCreationForEmail`, `consumePasswordChangeToken`, `consumePasswordCreationToken`, `setNewPassword` — password magic-link flow. Tokens reuse the better-auth `verifications` table with `pw-change:` / `pw-create:` identifier prefixes; rate-limited at 3/hour for unauthenticated sends.

The server ignores client authority claims at every layer. Add-event ops whose `event.who` does not match the current server identity are settled-without-insert. Delete-event ops only delete rows owned by the current server identity in the active group. New op kinds must extend the same shape + identity validation, not opt out of it.

## Internationalization

`packages/i18n/src/index.ts` exposes `t(locale, key)` and `tf(locale, key, vars)` over a typed key set. `pt` defines the union; `en` mirrors it (TypeScript fails the build if a key is missing). `detectLocaleFromHeader(acceptLanguage)` resolves the initial server-rendered locale from `Accept-Language`; the boot script in `apps/web/src/app/layout.tsx` overrides with the saved preference before paint. Date and number formatting go through `DATE_LOCALE[locale]`. Brand strings (`Aviões`, manifest name, page title) stay in Portuguese on purpose — they are not UI copy.

## Imagery

Hand-drawn paper-journal PNGs in `apps/web/public/` carry the empty/error/welcome states (see [`docs/images.md`](./images.md) for the catalog, the visual contract, and the prompt template). Light/dark pairs render through `next/image` (`unoptimized`) wrapped in `theme-light-only` / `theme-dark-only`. Every user-facing PNG is precached via `OFFLINE_ASSETS` in `apps/web/src/app/sw.js/route.ts` so empty/error screens survive offline. App icons (`apps/web/public/icons/*`) and the PWA manifest live in `apps/web/src/app/manifest.ts`.

## PWA

- `apps/web/src/app/manifest.ts` emits `/manifest.webmanifest` (PT brand strings).
- `apps/web/src/app/sw.js/route.ts` serves `/sw.js` with a cache name tied to Next's `BUILD_ID`. Every deploy invalidates prior caches automatically.
- The service worker caches public metadata/offline art, `/_next/static/*`, and static shell/RSC responses for the app routes.
- The service worker does not cache canonical data snapshots and does not own writes. Offline writes are the IndexedDB pending op queue.

## Verification

- Run `npm run db:generate` + `npm run db:migrate` after schema changes.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- For PWA/offline changes, verify with `npm run build && npm run start` on a mobile-width viewport.
- For auth/tenancy changes, verify the cross-account boundary by hand: sign in as user A, switch groups, sign out, sign in as user B, confirm B never sees A's group, members, or events.
