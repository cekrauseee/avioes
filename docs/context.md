# Context log

A living, append-mostly log of implementation decisions, in-flight work, and short rationales. Entries are added when something non-trivial lands or is decided, and removed when they become irrelevant (covered by docs, or undone).

This file is **not** a changelog. It is a working memory for the next agent or contributor opening the repo. Keep it short. If an entry has been true for a while and is no longer "context", promote it into the appropriate `docs/*.md` and delete it from here.

## Format

Each entry is a level-3 heading with an ISO date and a short title, followed by 1–5 lines of body. Newest first.

```md
### YYYY-MM-DD — Short title

Body. Why, not what. Link to files when relevant.
```

When you add an entry, also remove any older entry that has been superseded. The whole file should fit on one screen.

---

## Active

### 2026-05-02 — Offline sync hardening

Offline sync now treats browser `online` as a status reset, so the badge leaves immediately on reconnect; sync/pending UI is only visible while offline. `<OfflineSync/>` only mounts after `ap_id` exists, warms route RSC payloads with `router.prefetch`, and refreshes the current route after acked syncs. The SW no longer precaches identity-gated HTML during install; it warms shell HTML only after sync. Queue ops are validated at the Server Action boundary and recorded in `processed_ops` so retrying after a lost response is idempotent. Queue subscribers force one post-mount localStorage snapshot read to avoid stale Next client-cache payloads rendering old counts across offline navigation.

### 2026-05-01 — Offline robustness pass

Several fixes around the offline experience.

(1) `<SyncStatus/>` and the counter read from a shared `useOffline()` helper in `src/lib/offline-queue.ts` that treats the last sync round-trip as ground truth — `lastSyncOk === true` ⇒ online, `=== false` ⇒ offline, `null` ⇒ fall back to `navigator.onLine`. The browser firing the `offline` event resets `lastSyncOk` to `null` (the `offline` transition is reliable; `online` events frequently miss after PWA reloads).

(2) Drain logic moved out of `<Counter/>` into a route-agnostic `useOfflineSync()` hook mounted by `<OfflineSync/>` in `app/layout.tsx`, so `/diary` and `/scoreboard` also drain on `online`/`visibilitychange`/interval. Counter subscribes to `onSyncAck` for its server-snapshot override.

(3) `<DiaryView/>` and `<ScoreboardView/>` are client components that merge the localStorage queue into the server `events` array via `mergeQueueIntoEvents()` before computing streaks/totals, so offline taps appear in diary/scoreboard immediately.

(4) `drainOnce()` now probes the server even with an empty queue when `lastSyncOk !== true`. `syncEvents([])` returns counts and acts as a connectivity probe, so `lastSyncOk` reflects truth without depending on `navigator.onLine` events. The interval in `useOfflineSync` now runs while connectivity is unconfirmed even with no pending ops, fixing the "badge stuck offline after reload" / "badge stuck pending after reconnect" symptoms when the `online` event fails to fire.

(5) The service worker (`src/app/sw.js/route.ts`) only intercepts navigation requests now (`req.mode === 'navigate'`). Next 16 issues RSC payload fetches against the same URLs as page HTML; caching them under one key let RSC overwrite HTML (or vice-versa) and produced stale/mis-formatted responses on the next offline read — manifesting as the counter "going back to a previous state" after offline navigation. Static assets (`/_next/static/*`, immutable) rely on the browser HTTP cache; the SW no longer touches them.

(6) After a successful `drainOnce`, the client posts `{ type: 'refresh-shell' }` to the active SW. The SW re-fetches `/`, `/diary`, `/scoreboard` and updates its cache. Without this, the cached shell HTML only refreshed on full reload, so adding events online via Server Actions never updated the SW cache — and a later offline reload rendered counts from a snapshot that could be many sessions stale (regardless of where the queue/sync state was). With the message hook the cached HTML stays current after each sync, so an offline reload sees recent `myCount` and the queue delta lands on top of it correctly.

(7) `drainOnce` tracks a `rerunPending` flag: if `sync()` is called while a drain is in flight, the in-flight drain re-invokes itself once it finishes. Catches the case where the mount-time drain is still failing offline when the `online` event fires; without the rerun, the next attempt would only happen on the next interval tick, perceived as a "few-second" delay before the badge clears on reconnect.

(8) The counter's count animation only plays for explicit user interactions. `<Counter/>` keeps an `animateNextRef` flag set by `tap`/`undo` and uses `spring.set` (animated) or `spring.jump` (instant) accordingly. Mount, hydration (queue rehydrating from localStorage on reload), and sync overrides all jump — so reloading with N pending ops no longer replays a fake count-up animation as if the user had just tapped N times in a row.

(9) The counter's "total" header used `<AnimatePresence keyed={totalDisplay}>` directly, which transitioned on every render where the value changed — including the server-snapshot → client-snapshot transition during hydration (queue going from EMPTY to its real localStorage contents). Now gated by `useHydrated()`: pre-hydration the total renders as plain text, post-hydration the AnimatePresence mounts with its current key (no entry animation due to `initial={false}`), and only later changes (taps/undos) trigger transitions. `useHydrated()` lives in `offline-queue.ts` as an external store (microtask-deferred flip on client) — written that way to avoid the `react-hooks/set-state-in-effect` lint tripwire that the project treats as a hard rule.

(10) Sync feedback stays offline-only. The probe interval was tightened from 5s/15s to 2s/8s (queue/empty), so reconnect detection is fast even when the `online` event misses. Combined with `rerunPending`, reconnects feel near-instant in the common case and at most ~2s in the worst case.

(11) The SW now caches RSC payload fetches for shell paths in addition to navigation requests. Verified in `node_modules/next/dist/server/base-server.js` that Next 16 sets `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch` on App Router responses; the Cache API respects Vary on `cache.put`/`cache.match`, so HTML and RSC variants for the same URL coexist as separate entries instead of colliding. Without this, offline client-side navigation between routes failed and Next fell back to a full page reload (visible as the footer/nav re-mounting).

### 2026-05-01 — Service worker versioned by build id

The SW is now served by a route handler (`src/app/sw.js/route.ts`) instead of being a static file in `public/`. The handler injects Next's `BUILD_ID` (read from `.next/BUILD_ID` once and cached at module level) into the `CACHE` constant, so every deploy automatically invalidates prior caches via the existing `activate` handler. Removes the manual "bump `CACHE` constant" step that was easy to forget and caused stale-bundle issues for clients still holding an older SW. `pwa-register.tsx` still registers `/sw.js`; the URL is unchanged.

### 2026-05-01 — Offline write queue

Counter taps and undos go through `src/lib/offline-queue.ts` (localStorage key `ap_queue`, cross-tab via `BroadcastChannel('ap_queue')` + `storage` event, React via `useSyncExternalStore`). The displayed count is `serverCount + deltaFor(queue, who)`; the queue _is_ the optimistic state, so taps survive reload while offline. Server Action `syncEvents(ops)` (replaces the old `addAirplane`/`undoLast`) batches the queue back to Postgres via `applyEvents` in `src/lib/store.ts`; returns `{ acked, my, total }` so the client can pin a server-snapshot override during the props-revalidation gap (avoids the offline→online flicker where queue empties before revalidated props arrive). Drain triggers: mount, queue mutation, `online` event, `visibilitychange→visible`. Tap-then-undo while offline cancels locally without enqueuing the undo. `QueueOp` lives in `src/lib/types.ts` so the client lib and the server action can share the type without crossing the `'use client'` boundary at runtime. SW cache bumped to `airplanes-v5`.

`<SyncStatus/>` only renders when actually offline — no "sincronizando" label, the sync round-trip is silent because the override masks the gap. Pill is composed of static dot + AnimatePresence-keyed prefix/number/word tokens, so when only the count changes the unchanged tokens don't crossfade. The `· {totalDisplay} no total` block in the counter header uses the same per-token animation for the total.

### 2026-05-01 — Project name normalized to "airplanes"

Internal naming converged on `airplanes`: package name, docker compose service/container/db (`airplanes_postgres`, db `airplanes_db`, user/pass `airplanes/airplanes`), env example, identity cookie (`av_id` → `ap_id`), SW cache (`avioes-v3` → `airplanes-v4`), README/AGENTS/docs prose. UI strings (PWA `name`/`short_name`, page `title`, on-screen copy like "aviões") stay in Brazilian Portuguese — the visible name on a phone home screen is still "Aviões". Existing dev devices need to clear/re-pick identity because of the cookie rename.

### 2026-04-30 — Postgres persistence via Drizzle

Events and per-user theme moved out of cookies into Postgres so state follows the user across devices. Identity (`ap_id`) stays in a cookie — it's still a per-device selector for one of the two hardcoded users (`henrique`, `pietra`). Schema in `src/lib/db/schema.ts` (`events`, `preferences`, both keyed by an `identity` enum). Driver switch in `src/lib/db/index.ts`: `node-postgres` locally, `@neondatabase/serverless` when `VERCEL=1` (override with `DRIZZLE_DRIVER=neon`). Reads/writes go through `src/lib/store.ts`; `src/lib/cookies.ts` is now identity-only. `undoLast` is per-user (deletes the current user's most recent event, not the global last). `setTheme` is a no-op until an identity exists; theme is `'system'` during onboarding. Schema is applied with `npm run db:push` (no migration files generated, dev and prod). Local dev uses `docker-compose.yaml` (Postgres 17). The 1000-event cookie cap is gone with the cookie.

### 2026-04-30 — Mobile UX pass: tab bar, fewer borders, transitions

Bottom nav rewritten as 3 full-width tabs with a sliding `layoutId` underline (sage/clay per identity); tap targets ≥64px. The Nav is rendered by `app/layout.tsx` as a sibling of `{children}` (reading identity once), so it stays mounted across navigations and is unaffected by the page transition. `<ThemeToggle/>` is a 40×40 glyph button (`◐`/`☀`/`☾`) in each page header. Undo button is a 44px-tall pill with `↶` glyph. Decorative borders removed from streak cards, scoreboard list box, person cards, and the bottom-bar separator; the `border-x` container frame is gone (mobile + desktop). `app/template.tsx` does a 180ms fade-up between routes. Per-route `loading.tsx` skeletons render body only — Nav from layout stays put. `<Skel/>` primitive in `app/components/skeleton.tsx`. Service worker bumped to `avioes-v3`. `AppShell` is now just a scroll wrapper (no Nav, no props except `scroll`).

### 2026-04-30 — Initial documentation harness

Set up `README.md`, `docs/`, `AGENTS.md`. Source code switched to English-only (routes renamed from `/diario` → `/diary` and `/placar` → `/scoreboard`; UI labels stay Brazilian Portuguese). SW cache version bumped to `avioes-v2` because the precache list changed.

### 2026-04-30 — Mobile-only design frame

The whole app is wrapped in a 420px-wide centered column. Desktop renders as a phone-shaped frame, not a wide layout. Tightened typography sizes across all screens. See `docs/ui-ux.md`.

### 2026-04-30 — Labels: simple, not modernist

Replaced `uppercase tracking-[0.2em]` mono labels with plain `text-xs text-ink-faint` (or `text-[11px]` for timestamps). Mono is reserved for actual numerals. See `docs/ui-ux.md` ("Typography").

### 2026-04-30 — Optimistic counter via `useOptimistic`

Counter uses React 19's `useOptimistic` for both the per-person count and the global total. Wrapped in `startTransition`; the Server Action's `revalidatePath` is what reconciles. Avoids the `set-state-in-effect` lint rule.

### 2026-04-30 — Placeholder illustrations

All illustration slots use `<Placeholder/>` (dashed border, hatch, small label). Real drawings will swap the component, not the call sites.
