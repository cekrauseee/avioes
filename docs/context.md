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

### 2026-05-07 — Route transitions wait on exit

Route enter/exit animation now lives in `src/components/swipeable-content.tsx`, not `src/app/template.tsx`. `AnimatePresence` uses `mode="wait"` with clipped absolute route layers so the incoming page cannot paint over the outgoing page mid-exit; exit is a quick opacity-only fade, and route blur was removed to avoid mobile repaint flicker. The transition key comes from committed layout segments instead of optimistic `usePathname()`, so an old page cannot be re-keyed as the new route before the RSC payload lands.

### 2026-05-06 — Public /design kitchen-sink page

Public dev surface at `/design` — single scrolling page, no tabs, no auth. `src/app/design/page.tsx` (server, exports metadata + `robots: noindex,nofollow`) renders header + footer and composes the section components from `src/app/design/sections.tsx` (`ThemePaletteSection`, `ColorTokensSection`, `TypographySection`, `VariantsSection`, `SizesSection`, `ShapesSection`, `AlignmentSection`, `StatesSection`, `PromiseDemoSection`, `ButtonLinkSection`, `SkeletonSection`, `ExpandableSection`, plus the local `Section` helper).

Theme/palette state in `ThemePaletteSection` uses `useSyncExternalStore` over a MutationObserver on `document.documentElement` — the React Compiler immutability rule (`react-hooks/immutability`) blocks direct DOM writes from component bodies, so the writers live as plain module-level functions called from `onClick`. Toggling theme/palette only mutates the DOM (never written to the offline store), so it doesn't trample a signed-in user's saved choice. `app-runtime.tsx`'s `showAppNav` excludes `pathname.startsWith('/design')` so the bottom nav stays hidden whether the visitor is signed in or not.

### 2026-05-06 — Button design system rollout

`src/components/button.tsx` is the single source of truth for button chrome. Exports: `<Button>` (motion.button wrapper), `<ButtonLink>` (next/link wrapper accepting the same variant props), `buttonVariants({ variant, size, shape, align, fullWidth })` for raw class composition, and `usePromiseStatus()` for async actions. Variants: `primary` (sage solid), `secondary` (outline), `destructive` (clay solid), `destructive-outline` (clay border), `row` (bordered nav row), `row-accent` (sage variant of row), `ghost` (text-only neutral), `ghost-destructive` (text-only clay). Sizes: `xs` (h-10), `sm` (min-h-11 — for back buttons / pills), `md` (h-12 — default CTA), `lg` (min-h-14 — confirm grid). Shapes: `rounded` (default `rounded-xl`), `pill` (`rounded-full`), `square` (no rounding — for cells inside grids/cards). `align` lives orthogonally to the variant (default per-variant: `center` for CTAs, `between` for rows/ghost-destructive); pass `align='between'` etc. when you need to override.

`status: 'idle' | 'pending' | 'success' | 'error'` is the promise-status flavor. Pending renders an SVG spinner, success an animated check on sage fill, error a spring-popped warning on clay fill. Color overrides override the variant chrome so feedback reads everywhere. `pendingLabel` / `successLabel` / `errorLabel` swap text per state via `AnimatePresence mode='wait'`. `usePromiseStatus({ resetMs })` runs an async fn, sets status, auto-reverts to idle; StrictMode-safe (alive ref re-armed each effect run) with timer cleanup on unmount.

Rolled out across **every** non-bespoke button surface: settings (visual/group/account tabs), password screens (request/create/change-verify, including the Google-unlink destructive flows), auth screen (welcome, error, email/method/password/otp/name/no-password steps + the bottom submit), groups screens (groups, new, edit, manage including the inline invite button + member/invite row triggers + local confirm grid), invite flow (accept/reject with status, error fallback CTAs), and every sheet (account, connections, passkeys, invite-share). Pulsing-ellipsis loading states were replaced with spinner + pendingLabel; the "+" / "→" / "←" glyphs are passed through `leading` / `trailing` so layout stays consistent.

Bespoke buttons that intentionally stay outside the abstraction: `counter.tsx` tap circle (giant accented CTA with custom motion), `theme-toggle.tsx` (icon-only with hover-rotate glyph), `nav.tsx` / `toolbar-tabs.tsx` (tab bars with `layoutId` underline indicators), `confirm-row.tsx` (its grid+slot pattern is itself a primitive that hosts buttons), `expandable-item.tsx` `⋯` toggle (custom `w-14 text-xl` button with `border-l`). New i18n keys for sign-out promise status: `settings.signingOut`, `settings.signedOut`, `settings.signOutError`.

### 2026-05-06 — Settings pages had no Suspense fallback

`useSearchParams()` in `SettingsView` and `useSearchParams()` in `PasswordScreen` cause the client component to suspend on first render. Both pages wrapped them in `<Suspense>` without a `fallback`, so the route's `loading.tsx` skeleton was bypassed and the user saw a blank screen. Both `<Suspense>` boundaries now pass the colocated `Loading` component as `fallback`.

### 2026-05-06 — Docs reorganized: images.md + new code/UX guidelines

`docs/images.md` removed. Replaced by `docs/images.md` — a catalog of every PNG we ship (filename, dimensions, where it renders), the visual contract every illustration follows, and a fillable prompt template. Generation prompts are no longer checked in; when a new illustration is needed, the prompt is authored on the fly using the template, handed to Codex with the file name and target location, and the rendered PNG is dropped into `public/` and added to `OFFLINE_ASSETS` in `src/app/sw.js/route.ts`. New guideline sections landed across the docs: `code-style.md` gained Componentization, Internationalization (technical: `t` / `tf`, key conventions, `detectLocaleFromHeader`, no string-concat fragments), and Security/data boundaries (auth-guards, tenant-scoped reads, no client trust, hashed tokens at rest, redact-before-render); `ui-ux.md` gained Imagery (light/dark pairs, theme-aware preload, `OFFLINE_ASSETS`, no stock art) and a fuller Motion/navigation section covering swipe + wheel + key navigation, list/sheet motion primitives, and reduced-motion. `AGENTS.md` Hard Rules updated to current reality (better-auth multi-tenant, `MEMBER_COLORS`/`getMemberColor`, illustration request workflow) and the "two hardcoded users" rule is gone.

### 2026-05-06 — Connections moved into a bottom sheet

Account tab's inline Google connect/disconnect block was replaced with a single "gerenciar conexões" row that opens `ConnectionsSheet` (`src/components/connections-sheet.tsx`), mirroring the `PasskeysSheet` pattern: portal + motion, provider card with `⋯` expand, unlink behind `ConfirmRow`. The Google-only escape hatch (must create a password before unlinking) still routes to `/settings/password?reason=google`. The account tab no longer calls `listAccounts()` — the sheet owns that fetch and only runs it when opened, so "change password" / "manage passkeys" / "manage connections" rows render unconditionally with no skeletons. New i18n keys: `settings.manageConnections`, `settings.connectionsSheetSubtitle`.

### 2026-05-06 — Tailwind source scan pinned for worktree dev

`next dev` in the passkey worktree could hang forever on `Compiling /auth ...` while spawning orphaned `.next/dev/build/postcss.js` workers. Tailwind v4 source detection is now explicit in `src/app/globals.css` (`source(none)` + `@source '../'`) so it scans the app source tree instead of generated worktree output.

### 2026-05-06 — Passkey (WebAuthn) login and management

Added `@better-auth/passkey` plugin. Users with registered passkeys see a primary "entrar com chave de acesso" button on the login method step; OTP demotes to secondary style. Settings account tab has a single "gerenciar chaves de acesso" row that opens `PasskeysSheet` (bottom sheet, `src/components/passkeys-sheet.tsx`) for list/add/delete — mirrors the `InviteShareSheet` portal+motion pattern. Each list item uses the same `⋯`-toggle + expand pattern as `/groups`, with delete behind a `ConfirmRow`; the empty state uses the stable action button as a first-passkey CTA instead of swapping in a list placeholder. Error handling maps `error.code`: silent on user-cancelled (`AUTH_CANCELLED`, `ERROR_CEREMONY_ABORTED`), distinct copy for `PASSKEY_NOT_FOUND` (login) and `ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED` (register), localized fallback otherwise — no raw English `error.message` leaks. Schema: `passkey` table in `src/lib/db/auth-schema.ts`. Run `npm run db:push` after pulling.

### 2026-05-06 — Generic list/action components

`src/components/expandable-item.tsx` extracts the bordered card + main slot + `⋯` toggle + animated expanded children pattern used by list items with secondary actions. API: `main` slot, `expanded`, `onToggle`, `toggleAriaLabel`, optional `active` (sage ring), children render inside a measured AnimatePresence panel so nested confirm-row height changes animate locally. Used by `groups-screen.tsx` (group cards), `connections-sheet.tsx` (Google card), and `passkeys-sheet.tsx` (each passkey). Toggle standardized at `w-14 text-xl` (groups dropped from `w-20 text-2xl`).

`src/components/confirm-row.tsx` is the matching destructive-confirm grid (clay confirm button, Motion fade-in, optional top border) rendered inside ExpandableItem children. It also exports `ConfirmActionSlot` + `ConfirmTriggerRow`; exiting rows are popped absolute during fade so opacity and panel-height transitions start together without stacked heights. API: `label`, `busy`, `disabled?`, `cancelLabel`, `confirmLabel`, `onCancel`, `onConfirm`, `bordered?`. Tap target `min-h-14`.

`src/components/animated-list.tsx` centralizes list item motion for `/groups`, passkey management, and group-member management. It defaults to `AnimatePresence mode='popLayout'` plus `forwardRef` list items so removed rows fade out quickly while siblings reflow with position-only layout transforms; `PasskeysSheet` opts into `mode='wait'` so the sheet waits for the deleted row's fade before its own layout transition. Bottom sheets that contain these lists should also opt into position-only layout so the sheet top moves by transform as content height changes.

### 2026-05-06 — Invitation security hardening

Six fixes to the invite flow: (1) `acceptInvitation`/`rejectInvitation` require `user.emailVerified` — prevents unverified email+password signup from claiming invites. (2) Invite page redacts group name, inviter name/image unless authenticated user's email matches AND is verified. (3) Email mismatch message no longer leaks the invited email. (4) Invite tokens stored as SHA-256 hashes in the existing `token` column — plaintext only in URL/email. (5) Per-owner rate limit: 10 invites/hour, checked atomically via `pg_advisory_xact_lock` inside the creation transaction. (6) Partial unique index `unique_pending_invite_per_group_email` on `(group_id, invited_email) WHERE status = 'pending'` prevents duplicate pending invites at the DB level; unique constraint violations caught and returned as controlled errors.

**Deploy steps (one-time, run before first deploy of this branch)**:

```sql
-- 1. Cancel pending invites (they use plaintext tokens, won't work post-deploy)
UPDATE group_invitations SET status = 'cancelled' WHERE status = 'pending';
-- 2. Scrub plaintext tokens from historical rows (UUIDs are 36 chars; new hashes are 64)
UPDATE group_invitations SET token = 'migrated-' || id WHERE length(token) = 36;
```

Do NOT rerun after deploy — new rows already store hashes. Then `npm run db:push` to apply the partial unique index and `expired` enum value.

Hourly cron (`/api/cron/invitations`) bulk-expires overdue pending invites. Set `CRON_SECRET` in Vercel project env vars; Vercel sends it as `Authorization: Bearer <secret>`. Accept/reject also mark rows expired on runtime time check as defense-in-depth. Config in `vercel.json`.

### 2026-05-05 — Password flows redesigned to email-based magic link

Password creation and update no longer happen inline. Both flows now send an email with a 15-minute magic link to a dedicated page where the actual password form lives. New flows:

- **Change** (settings): CTA → email with link to `/settings/password/verify/[token]` → form with current+new+confirm → done. Requires login.
- **Create** (settings, Google-only): CTA → email with link to `/password/create/[token]` → form with new+confirm → optional Google unlink. No login required at the link.
- **Create** (login screen): when a user has no credential account and clicks "continuar com senha", a `no-password` step appears with CTA to send creation email → same `/password/create/[token]` flow.

Tokens reuse the `verifications` table with `pw-change:` / `pw-create:` identifier prefixes. Rate limited (3/hour/email for unauthenticated sends). New email template at `src/emails/password-request.tsx`, new components `password-create-screen.tsx` and `password-change-verify-screen.tsx`. The old inline form in `password-screen.tsx` is now a single CTA button that triggers the email.

### 2026-05-05 — Favicon + flying-airplane icon swap

Browser favicon now uses `public/favicon-{light,dark}.png` via `metadata.icons` in `src/app/layout.tsx` with `prefers-color-scheme` media queries; the old `src/app/favicon.ico` was deleted because the app-folder convention takes precedence over metadata and would have shadowed the new PNGs. The counter's tap fly-by in `src/components/plane-arc.tsx` swapped the Unicode `✈` glyph for `flying-airplane-{light,dark}.png` rendered with `next/image` (`unoptimized`) and the existing `theme-light-only` / `theme-dark-only` pair. Apple touch icon points at the existing `/icons/icon-1024.png`. Prompts for all six (favicon + flying airplane + PWA `icon-1024` + maskable) live in `docs/images.md`. PWA icons in `public/icons/` haven't been regenerated yet — the old May-1 files are still in place; manifest already references the right paths, so dropping new files in is enough.

### 2026-05-05 — Desktop horizontal page navigation

Route swipe navigation now also listens for dominant horizontal wheel gestures and unmodified Left/Right arrow keys, so desktop users can move between `/`, `/diary`, `/scoreboard`, and `/settings` without click-dragging. The wheel handler runs in capture phase, accumulates `deltaX` per gesture, accepts a little vertical noise, prevents browser horizontal overscroll inside the app frame, and locks until wheel input settles so one trackpad gesture only advances one page. Wheel swipes use a lower threshold than drag swipes, so they feel closer to native trackpad paging. This lets horizontal swipes work even when the cursor is over a vertical `.scroll-area`. Settings tab content uses the same wheel/key path and still spills left from the first tab back to `/scoreboard`.

### 2026-05-05 — Group invitations

Replaced direct member addition with an invitation flow. Owner types email on `/manage` → creates a 24h invite → email sent via Resend + share sheet opens (copy link / Web Share API). Recipient opens `/invite/[token]` (public route, outside proxy middleware) → sees group name + inviter → must sign in to respond → only the invited email can accept. Post-accept: "congrats" screen with CTA to count page; the joined group is set as active. Auth screen adapts copy when `nextPath` starts with `/invite/`. New DB table `group_invitations` with `pending/accepted/rejected/cancelled` status enum. Manage page shows pending invites below members with cancel option. Old `lookupUserToAdd` and `addMemberByEmail` actions removed. New illustrations needed: `invite-hero-{light,dark}.png`, `invite-accepted-{light,dark}.png` (prompts in `docs/images.md`). Run `npm run db:push` after pulling.

### 2026-05-05 — Email OTP login

Existing-account sign-in now offers a one-time code in addition to password. After the email step, if `emailExists` returns true the auth screen advances to a new `method` step (otherwise it goes straight to `password` for the existing sign-up flow). `method` shows two buttons — primary "enviar código por e-mail", secondary "continuar com senha" — plus a back link. Picking the code path advances to a new `otp` step (single 6-digit input, `inputMode='numeric'`, `autoComplete='one-time-code'`, auto-submits on the 6th digit) and immediately calls `authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })`. Resend is throttled client-side via a 30s countdown rendered inline ("reenviar em Ns" → "reenviar código"). Verification uses `authClient.signIn.emailOtp({ email, otp })`. Server side, `src/lib/auth.ts` registers the better-auth `emailOTP` plugin with `disableSignUp: true` (sign-up via OTP would skip our required `firstName` field, so new accounts must keep using the password+name flow), `expiresIn: 300`, `allowedAttempts: 5`. The client mirrors the server with `emailOTPClient()` in `src/lib/auth-client.ts`. OTPs are mailed via Resend; the React Email template lives at `src/emails/otp-login.tsx` and is rendered + sent inside `src/lib/email.tsx` (`sendOtpEmail`). The template uses inline styles only (paper bg, sage italic accent, mono code with wide letter-spacing, Fraunces via `<Font/>` for the heading) so it survives most clients. New env vars: `RESEND_API_KEY` (when missing in dev, the OTP is logged to the server console and no mail is sent), `EMAIL_FROM` (defaults to `Aviões <onboarding@resend.dev>` until a custom domain is verified). No DB migration — emailOTP reuses the existing `verifications` table.

### 2026-05-05 — User model split into firstName + lastName

`users` table gained nullable `first_name` and `last_name` columns; the existing `name` column stays (better-auth core requires it) and is composed at write time. Better-auth registers them via `user.additionalFields` (`firstName` required, `lastName` optional). The auth client mirrors the same shape via `inferAdditionalFields<typeof auth>()` so `signUp.email({ ..., firstName, lastName })` typechecks. The signup `'name'` step now renders two stacked `Field`s ("nome" + "sobrenome (opcional)") with `given-name` / `family-name` autocomplete; on submit the screen sends `firstName`, `lastName`, and a composed `name`. For Google: `socialProviders.google.mapProfileToUser` returns `{ firstName: profile.given_name, lastName: profile.family_name? }` (omitted when Google has no family_name to avoid clobbering existing values). For an existing email-account user logging in via Google, `account.accountLinking = { enabled: true, trustedProviders: ['google'], updateUserInfoOnLink: true }` links the account by verified email match and refreshes user fields (image, firstName, lastName, name) from the Google profile. `GroupMember` replaced `name: string` with `firstName: string` + `lastName: string \| null`; the helper `getMemberName` was split into `getMemberFirstName` (for inline contexts — counter, diary, scoreboard streak labels) and `getMemberFullName` (for profile cards in `account-sheet` and `settings-view`). Reads in `store.ts` (`readGroupMembersForMember`, `findUserByEmail`) backfill nulls by splitting the legacy `name` on whitespace, so existing rows stay readable until a real Google sign-in updates them. The IndexedDB snapshot version bumped to **3** because the `GroupMember` shape changed; old caches are rejected and rebootstrapped from the server. Run `npm run db:push` after pulling.

### 2026-05-05 — Google OAuth + user avatars

Added `socialProviders.google` to `src/lib/auth.ts` and a "continuar com Google" button on the auth welcome step (`AuthScreen`). Better-auth handles user creation and account linking automatically: first sign-in creates the user with `name` + `image` from the Google profile; subsequent sign-ins reuse the same row when the verified email matches. The users table already had an `image` column, so no schema change was needed (`npm run db:push` is **not** required for this change). `GroupMember` gained `image: string | null`; `readGroupMembersForMember` selects it; `account-sheet`, `settings-view`, `manage-group-screen`, and `scoreboard-view` (the `Score` component) render the photo as the avatar when present and fall back to the colored initial otherwise. `next/image` with `unoptimized` + `referrerPolicy="no-referrer"` is used so Google's CDN serves the photo without remotePatterns config. OAuth failures are caught via `errorCallbackURL` pointing back at `/auth?next=…`; better-auth appends `?error=<code>`, the auth page reads it server-side and passes `oauthError` into `AuthScreen`, which mounts on a dedicated `'error'` step (illustration + "tentar com Google" / "continuar com e-mail" / "voltar ao início"). The error param is stripped from the URL on mount via `router.replace` so refresh lands cleanly on welcome. New env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (see `.env.example`); the OAuth redirect URI registered in Google Cloud must be `<BETTER_AUTH_URL>/api/auth/callback/google`.

### 2026-05-05 — Auth screen welcome step

`AuthScreen` now starts on a `welcome` step before the email input. Welcome shows a tagline ("anote o céu / juntos"), the existing onboarding-hero illustration as the centrepiece (~82 % column width, vertically centred), and a single "continuar com e-mail" CTA. Email/password/name steps no longer render the hero — only the welcome step does. The email step gained a back-to-welcome button. Step ordering is `welcome → email → password → name`. Future identity providers (Google, Apple) plug in as additional buttons on the welcome step. Image regeneration spec lives in `docs/images.md`.

### 2026-05-05 — Diary scroll and route swipe coexist

The app frame and route shells need `min-h-0` at each flex boundary so long inner lists shrink into their `.scroll-area` instead of growing past the fixed body and getting clipped. Route/tab swipe wrappers use Motion `dragDirectionLock` so vertical list movement and horizontal navigation can coexist. Scoreboard now renders the full streak sequence, not just the last eight.

### 2026-05-04 — Tenant boundary hardening

Group reads now go through membership-scoped store queries (`readGroupMembership`, `readGroupMembersForMember`, `readEventsForMember`) before returning group names, member lists, or events. Route guards and sync both re-check membership so stale `activeGroupId` values clear instead of leaking or writing into groups the user no longer belongs to.

### 2026-05-04 — Auth is route-based, not component fallback

Unauthenticated access to protected pages (`/`, `/diary`, `/scoreboard`, `/settings`, `/groups/*`) redirects to `/auth?next=...` via `src/proxy.ts` before render, with server page guards still validating Better Auth sessions. `/auth` is the public login route and redirects authenticated users away. Login/group setup screens now render inside the normal app frame/background instead of fullscreen overlay components.

### 2026-05-04 — Groups rearchitecture: generic multi-user system

Replaced hardcoded `'henrique' | 'pietra'` identities with a full group-based multi-user system. Authentication via **better-auth** (email+password, unified sign-in/sign-up flow). Users can create and join multiple groups; an `activeGroupId` tracks the current context. Groups have `owner` and `member` roles; owners add members by email and can remove non-owners. Identity is now a string userId from better-auth sessions (not a cookie enum). `IDENTITIES` map replaced by `MEMBER_COLORS` array + `getMemberColor(userId, members)` / `getMemberName(userId, members)` helpers. Four new screens: `AuthScreen`, `GroupsScreen`, `NewGroupScreen`, `ManageGroupScreen`. New routes: `/groups`, `/groups/new`, `/groups/[id]/manage`. Offline store extended with `activeGroupId` and `groupMembers`. IndexedDB version bumped to 2 (clears legacy per-device queue). Schema: `groups`, `group_members` tables + better-auth tables (`users`, `sessions`, `accounts`, `verifications`). Env vars required: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`. Run `npm run db:push` after pulling.

### 2026-05-05 — i18n: server-side detection + full coverage

Server-side locale detection via `Accept-Language` header in `layout.tsx` — the initial `<html lang>` now matches the user's browser language instead of being hardcoded to `pt-BR`. Client-side boot script still overrides with the saved preference when present. New `detectLocaleFromHeader()` and `tf()` (template interpolation) helpers in `src/lib/i18n.ts`. All previously hardcoded strings in `auth-screen`, `groups-screen`, `manage-group-screen`, `new-group-screen`, `edit-group-screen`, and `password-screen` now go through `t()`/`tf()`. ~86 new translation keys added to both `pt` and `en`. Existing keys whose values didn't match the actual code were updated (`groups.subtitle`, `groups.new.subtitle`, `groups.new.namePlaceholder`). Note: layout is now dynamic (reads `headers()`), which is fine for this auth-gated PWA.

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
