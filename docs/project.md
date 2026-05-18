# Project

## What it is

Aviões is a small group airplane-counting game. When a group of people are together and see an airplane in the sky, the person who spotted it taps the screen. The app keeps three views over those taps, scoped to whichever group the user is currently looking at:

1. **Counter** — the home screen. A single big number for the active person, a smaller number for everyone else combined, a tap zone that increments by one.
2. **Diário / Diary** — a chronological log of "streaks": consecutive sightings by the same person collapse into one entry. A streak ends when someone else taps.
3. **Placar / Scoreboard** — totals, the leader, longest streaks, and the most recent streaks.

Users authenticate with **better-auth**: email + password, email OTP (6-digit one-time code), passkey (`@better-auth/passkey`), or Google OAuth. The same flow handles sign-in and sign-up; passwordless onboarding falls back to a magic link for password creation. After authenticating, users select or create a **group** to start counting. Each user can belong to multiple groups, switching between them through the account sheet. Within a group, the `owner` can edit the name, delete the group, invite members by email, and remove non-owner members.

## What it is not

- Not a generic social platform. Groups are small, personal, and invite-only (no public discovery).
- Not a generic counter. The group-based, streak-based diary is the entire point.
- Not designed for desktop. Desktop renders a centered phone-width frame, but the design target is mobile.
- Not a multilingual marketing site. The app ships PT (default) and EN side-by-side via `t(locale, key)`; new strings must land in both.

## Constraints

- **Auth**: better-auth with email + password, email OTP, passkey, and Google OAuth. Sessions live in an `HttpOnly Secure SameSite=Lax` cookie issued by better-auth — client JS must not read it. Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (OTP/invite/password emails; logged to console in dev when missing), `EMAIL_FROM`, `CRON_SECRET` (hourly invite expiry job).
- **Tenancy**: all reads and writes that touch group data go through membership-scoped queries in `packages/db/src/store.ts` and the guards in `packages/auth/src/guards.ts`. The server never trusts a client-supplied `userId` / `groupId`. Sensitive short-lived secrets (invitation tokens, password-create / password-change tokens) are stored hashed at rest.
- **Storage**: airplane events are group-scoped in Postgres (`events.group_id`). Per-user preferences (theme, palette, locale, active group) live in the `preferences` table. Local dev uses `node-postgres` against `docker-compose.yaml`; production uses `@neondatabase/serverless`.
- **Internationalization**: every visible string flows through `t(locale, key)` / `tf(locale, key, vars)` from `packages/i18n/src/index.ts`. Brand strings (`Aviões`, manifest name, page title) stay in Portuguese on purpose. Adding a key means adding it to `pt` first (it defines the union) and then to `en` — TypeScript fails the build if `en` is missing one.
- **Routing**: the App Router serves static client shells. Critical state comes from the offline store; Server Actions in `apps/web/src/actions.ts` bootstrap and sync canonical Postgres state. URL slugs follow the source code (`/diary`, `/scoreboard`); visible nav labels are localized.
- **Offline**: the PWA caches the app shell and the illustration set. Events / preferences live in IndexedDB as a canonical snapshot plus ordered pending ops, then replay through Server Actions on reconnect. Pending op queues stay tab-local; BroadcastChannel only shares canonical-snapshot hints.
- **Images**: empty, error, welcome, and onboarding states are hand-drawn paper-journal PNGs (light/dark pairs). The catalog, visual contract, and request workflow live in [`docs/images.md`](./images.md).

## Roadmap (not promises)

- Optional: per-day grouping in the diary.
- Optional: shared/public read-only links to a group's diary or scoreboard.
- Optional: replace the intro carousel `<Placeholder/>` slots with real illustrations.
