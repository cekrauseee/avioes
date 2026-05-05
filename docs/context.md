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

### 2026-05-05 — Email OTP login

Existing-account sign-in now offers a one-time code in addition to password. After the email step, if `emailExists` returns true the auth screen advances to a new `method` step (otherwise it goes straight to `password` for the existing sign-up flow). `method` shows two buttons — primary "enviar código por e-mail", secondary "continuar com senha" — plus a back link. Picking the code path advances to a new `otp` step (single 6-digit input, `inputMode='numeric'`, `autoComplete='one-time-code'`, auto-submits on the 6th digit) and immediately calls `authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })`. Resend is throttled client-side via a 30s countdown rendered inline ("reenviar em Ns" → "reenviar código"). Verification uses `authClient.signIn.emailOtp({ email, otp })`. Server side, `src/lib/auth.ts` registers the better-auth `emailOTP` plugin with `disableSignUp: true` (sign-up via OTP would skip our required `firstName` field, so new accounts must keep using the password+name flow), `expiresIn: 300`, `allowedAttempts: 5`. The client mirrors the server with `emailOTPClient()` in `src/lib/auth-client.ts`. OTPs are mailed via Resend; the React Email template lives at `src/emails/otp-login.tsx` and is rendered + sent inside `src/lib/email.tsx` (`sendOtpEmail`). The template uses inline styles only (paper bg, sage italic accent, mono code with wide letter-spacing, Fraunces via `<Font/>` for the heading) so it survives most clients. New env vars: `RESEND_API_KEY` (when missing in dev, the OTP is logged to the server console and no mail is sent), `EMAIL_FROM` (defaults to `Aviões <onboarding@resend.dev>` until a custom domain is verified). No DB migration — emailOTP reuses the existing `verifications` table.

### 2026-05-05 — User model split into firstName + lastName

`users` table gained nullable `first_name` and `last_name` columns; the existing `name` column stays (better-auth core requires it) and is composed at write time. Better-auth registers them via `user.additionalFields` (`firstName` required, `lastName` optional). The auth client mirrors the same shape via `inferAdditionalFields<typeof auth>()` so `signUp.email({ ..., firstName, lastName })` typechecks. The signup `'name'` step now renders two stacked `Field`s ("nome" + "sobrenome (opcional)") with `given-name` / `family-name` autocomplete; on submit the screen sends `firstName`, `lastName`, and a composed `name`. For Google: `socialProviders.google.mapProfileToUser` returns `{ firstName: profile.given_name, lastName: profile.family_name? }` (omitted when Google has no family_name to avoid clobbering existing values). For an existing email-account user logging in via Google, `account.accountLinking = { enabled: true, trustedProviders: ['google'], updateUserInfoOnLink: true }` links the account by verified email match and refreshes user fields (image, firstName, lastName, name) from the Google profile. `GroupMember` replaced `name: string` with `firstName: string` + `lastName: string \| null`; the helper `getMemberName` was split into `getMemberFirstName` (for inline contexts — counter, diary, scoreboard streak labels) and `getMemberFullName` (for profile cards in `account-sheet` and `settings-view`). Reads in `store.ts` (`readGroupMembersForMember`, `findUserByEmail`) backfill nulls by splitting the legacy `name` on whitespace, so existing rows stay readable until a real Google sign-in updates them. The IndexedDB snapshot version bumped to **3** because the `GroupMember` shape changed; old caches are rejected and rebootstrapped from the server. Run `npm run db:push` after pulling.

### 2026-05-05 — Google OAuth + user avatars

Added `socialProviders.google` to `src/lib/auth.ts` and a "continuar com Google" button on the auth welcome step (`AuthScreen`). Better-auth handles user creation and account linking automatically: first sign-in creates the user with `name` + `image` from the Google profile; subsequent sign-ins reuse the same row when the verified email matches. The users table already had an `image` column, so no schema change was needed (`npm run db:push` is **not** required for this change). `GroupMember` gained `image: string | null`; `readGroupMembersForMember` selects it; `account-sheet`, `settings-view`, `manage-group-screen`, and `scoreboard-view` (the `Score` component) render the photo as the avatar when present and fall back to the colored initial otherwise. `next/image` with `unoptimized` + `referrerPolicy="no-referrer"` is used so Google's CDN serves the photo without remotePatterns config. OAuth failures are caught via `errorCallbackURL` pointing back at `/auth?next=…`; better-auth appends `?error=<code>`, the auth page reads it server-side and passes `oauthError` into `AuthScreen`, which mounts on a dedicated `'error'` step (illustration + "tentar com Google" / "continuar com e-mail" / "voltar ao início"). The error param is stripped from the URL on mount via `router.replace` so refresh lands cleanly on welcome. New env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (see `.env.example`); the OAuth redirect URI registered in Google Cloud must be `<BETTER_AUTH_URL>/api/auth/callback/google`.

### 2026-05-05 — Auth screen welcome step

`AuthScreen` now starts on a `welcome` step before the email input. Welcome shows a tagline ("anote o céu / juntos"), the existing onboarding-hero illustration as the centrepiece (~82 % column width, vertically centred), and a single "continuar com e-mail" CTA. Email/password/name steps no longer render the hero — only the welcome step does. The email step gained a back-to-welcome button. Step ordering is `welcome → email → password → name`. Future identity providers (Google, Apple) plug in as additional buttons on the welcome step. Image regeneration spec lives in `docs/illustrations.md`.

### 2026-05-05 — Diary scroll and route swipe coexist

The app frame and route shells need `min-h-0` at each flex boundary so long inner lists shrink into their `.scroll-area` instead of growing past the fixed body and getting clipped. Route/tab swipe wrappers use Motion `dragDirectionLock` so vertical list movement and horizontal navigation can coexist. Scoreboard now renders the full streak sequence, not just the last eight.

### 2026-05-04 — Tenant boundary hardening

Group reads now go through membership-scoped store queries (`readGroupMembership`, `readGroupMembersForMember`, `readEventsForMember`) before returning group names, member lists, or events. Route guards and sync both re-check membership so stale `activeGroupId` values clear instead of leaking or writing into groups the user no longer belongs to.

### 2026-05-04 — Auth is route-based, not component fallback

Unauthenticated access to protected pages (`/`, `/diary`, `/scoreboard`, `/settings`, `/groups/*`) redirects to `/auth?next=...` via `src/proxy.ts` before render, with server page guards still validating Better Auth sessions. `/auth` is the public login route and redirects authenticated users away. Login/group setup screens now render inside the normal app frame/background instead of fullscreen overlay components.

### 2026-05-04 — Groups rearchitecture: generic multi-user system

Replaced hardcoded `'henrique' | 'pietra'` identities with a full group-based multi-user system. Authentication via **better-auth** (email+password, unified sign-in/sign-up flow). Users can create and join multiple groups; an `activeGroupId` tracks the current context. Groups have `owner` and `member` roles; owners add members by email and can remove non-owners. Identity is now a string userId from better-auth sessions (not a cookie enum). `IDENTITIES` map replaced by `MEMBER_COLORS` array + `getMemberColor(userId, members)` / `getMemberName(userId, members)` helpers. Four new screens: `AuthScreen`, `GroupsScreen`, `NewGroupScreen`, `ManageGroupScreen`. New routes: `/groups`, `/groups/new`, `/groups/[id]/manage`. Offline store extended with `activeGroupId` and `groupMembers`. IndexedDB version bumped to 2 (clears legacy per-device queue). Schema: `groups`, `group_members` tables + better-auth tables (`users`, `sessions`, `accounts`, `verifications`). Env vars required: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`. Run `npm run db:push` after pulling.

### 2026-05-04 — Internationalization (i18n): per-user language preference

Two locales: `pt` (Brazilian Portuguese, default) and `en` (English). Stored per-user in Postgres via a `locale` column on `preferences`, synced through the offline op queue (`set-locale` op kind). Browser language detected on first visit as default. All UI strings extracted to `src/lib/i18n.ts` with translation keys. Locale selectable on `/settings` (new "idioma" section). The `<html lang>` attribute, `Intl.DateTimeFormat` locale, and all component text update reactively. Boot script in `layout.tsx` detects and applies locale before paint. Metadata (title "Aviões", manifest) stays Portuguese — it's the brand name. Run `npm run db:push` after pulling to add the `locale` enum and column.

### 2026-05-04 — Palette themes: per-user color customization

Six palettes (Caderno/Oceano/Lavanda/Terra/Flor/Céu) selectable on a new `/settings` page ("Ajustes"), persisted per-user in Postgres via a `palette` column on `preferences` and synced through the offline op queue (`set-palette` op kind). Each palette overrides all CSS color tokens for both light and dark modes via `[data-palette]` selectors in `globals.css`. The palette is applied at boot via the `ap_boot` localStorage hint (same pattern as theme mode). Nav gained a 4th tab for settings. ThemeToggle remains in page headers for quick light/dark/system switching; the settings page has both palette and mode pickers. Run `npm run db:push` after pulling to add the `palette` enum and column.

### 2026-05-03 — Illustrations wired into the flow

Replaced `<Placeholder/>` slots and several text-glyph fallbacks with real PNGs in `public/`, paired light/dark via the existing `theme-light-only` / `theme-dark-only` utilities and rendered with `next/image` (`unoptimized`). Mappings: onboarding hero + per-person avatars (onboarding picker and scoreboard `Score`), empty-state illustrations for counter (only when both totals are 0, fades out on first tap), diary, and scoreboard, plus `airplane-not-found` (404), `airplane-error` (500), and `splash` (root `loading.tsx`). The new asset URLs were added to `OFFLINE_ASSETS` in `src/app/sw.js/route.ts` so empty states/avatars survive offline. `src/components/placeholder.tsx` was removed (no remaining call sites).

### 2026-05-03 — Backlog doc for deferred follow-ups

Deferred, non-current work now lives in `docs/backlog.md` with priority, trigger, and done criteria. `AGENTS.md` explains when to use backlog versus `context.md`: backlog is for parked follow-ups, context is still the active-session scratchpad.

### 2026-05-02 — Offline-first architecture reset

Offline state now has one source of truth in the browser: IndexedDB stores a canonical server snapshot plus ordered pending ops, while localStorage only stores `ap_boot` (last-known identity/theme display hint). BroadcastChannel shares canonical snapshot hints only; pending op queues remain tab-local. RSC pages are static shells; Server Actions only write identity, bootstrap snapshots, and sync ops. Pending airplane/theme ops are untrusted until server validation under the current `ap_id` cookie; future real auth should keep bearer/session tokens in httpOnly cookies, not client storage. Sync drains in 250-op batches without settling overflow, and old `ap_queue` localStorage queues are migrated into the new op model when possible. See `docs/architecture.md`.

### 2026-05-01 — Service worker versioned by build id

The SW is now served by a route handler (`src/app/sw.js/route.ts`) instead of being a static file in `public/`. The handler injects Next's `BUILD_ID` (read from `.next/BUILD_ID` once and cached at module level) into the `CACHE` constant, so every deploy automatically invalidates prior caches via the existing `activate` handler. Removes the manual "bump `CACHE` constant" step that was easy to forget and caused stale-bundle issues for clients still holding an older SW. `pwa-register.tsx` still registers `/sw.js`; the URL is unchanged.

### 2026-05-01 — Project name normalized to "airplanes"

Internal naming converged on `airplanes`: package name, docker compose service/container/db (`airplanes_postgres`, db `airplanes_db`, user/pass `airplanes/airplanes`), env example, identity cookie (`av_id` → `ap_id`), SW cache (`avioes-v3` → `airplanes-v4`), README/AGENTS/docs prose. UI strings (PWA `name`/`short_name`, page `title`, on-screen copy like "aviões") stay in Brazilian Portuguese — the visible name on a phone home screen is still "Aviões". Existing dev devices need to clear/re-pick identity because of the cookie rename.

### 2026-04-30 — Postgres persistence via Drizzle

Events and per-user theme moved into Postgres. DB access goes through `src/lib/store.ts`. Schema applied with `npm run db:push`. Local dev uses `docker-compose.yaml` (Postgres 17).

### 2026-04-30 — Mobile UX pass: tab bar, fewer borders, transitions

Bottom nav rewritten as 3 full-width tabs with a sliding `layoutId` underline (sage/clay per identity); tap targets ≥64px. The Nav is rendered by `app/layout.tsx` as a sibling of `{children}` (reading identity once), so it stays mounted across navigations and is unaffected by the page transition. `<ThemeToggle/>` is a 40×40 glyph button (`◐`/`☀`/`☾`) in each page header. Undo button is a 44px-tall pill with `↶` glyph. Decorative borders removed from streak cards, scoreboard list box, person cards, and the bottom-bar separator; the `border-x` container frame is gone (mobile + desktop). `app/template.tsx` does a 180ms fade-up between routes. Per-route `loading.tsx` skeletons render body only — Nav from layout stays put. `<Skel/>` primitive in `app/components/skeleton.tsx`. Service worker bumped to `avioes-v3`. `AppShell` is now just a scroll wrapper (no Nav, no props except `scroll`).

### 2026-04-30 — Initial documentation harness

Set up `README.md`, `docs/`, `AGENTS.md`. Source code switched to English-only (routes renamed from `/diario` → `/diary` and `/placar` → `/scoreboard`; UI labels stay Brazilian Portuguese). SW cache version bumped to `avioes-v2` because the precache list changed.

### 2026-04-30 — Mobile-only design frame

The whole app is wrapped in a 420px-wide centered column. Desktop renders as a phone-shaped frame, not a wide layout. Tightened typography sizes across all screens. See `docs/ui-ux.md`.

### 2026-04-30 — Labels: simple, not modernist

Replaced `uppercase tracking-[0.2em]` mono labels with plain `text-xs text-ink-faint` (or `text-[11px]` for timestamps). Mono is reserved for actual numerals. See `docs/ui-ux.md` ("Typography").
