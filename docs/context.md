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
