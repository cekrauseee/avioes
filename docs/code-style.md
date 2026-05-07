# Code style

## Language and naming

- **Source code is English.** Identifiers, file names, comments, commit messages, and documentation are all in English.
- **UI strings are Brazilian Portuguese.** They live as JSX text directly inside components — there is no i18n layer. Keep the Portuguese natural, lowercase where the design calls for it.
- URL slugs follow the source code: `/diary`, `/scoreboard` — not `/diario`, `/placar`. The visible nav labels are Portuguese; the routes are not.
- File names are kebab-case (`plane-arc.tsx`, `app-shell.tsx`). Components are PascalCase. Types are PascalCase. Functions and variables are camelCase. Constants are UPPER_SNAKE only when they are real constants used across files.

## Server vs client

- Default to Server Components. Add `"use client"` only when the component needs state, effects, browser APIs, or event handlers.
- Server Components should stay shell-only for critical app state. They never call `cookies().set` — that only happens in Server Actions.
- Client Components do not read cookies directly. They read the offline store and let Server Actions bootstrap/sync canonical state.
- Mutations go through Server Actions in `app/actions.ts`. Don't add fetch routes for mutations.

## React patterns

- Offline optimistic UI comes from the external store projection, not mirrored component state. The lint rule `react-hooks/set-state-in-effect` is enforced — calling `setState` inside an effect to mirror props is a bug.
- Wrap Server Action calls in `startTransition` when they are invoked from event handlers and the UI also changes immediately.
- Don't mirror props into state with `useEffect`. For browser persistence/sync, use the external offline store (`useSyncExternalStore`) instead.

## Componentization

The component tree is shallow on purpose. Most screens live in a single `*-screen.tsx` or `*-view.tsx` file under `src/components/`. Extract a component when one of these is true:

- The same JSX is used in **two or more places** verbatim (e.g. `expandable-item.tsx`, `confirm-row.tsx`, `animated-list.tsx` were all extracted because three list surfaces shared the pattern).
- A subtree owns **non-trivial behaviour** that distracts from the screen it lives in — bottom sheets, motion-driven panels, gated transitions. Bottom sheets in particular always live in their own `*-sheet.tsx` file (`account-sheet.tsx`, `connections-sheet.tsx`, `passkeys-sheet.tsx`, `invite-share-sheet.tsx`).
- A subtree has **its own internal state** that the parent does not need to read — a passkey list managing its expanded row, an OTP input running a resend countdown.

Anti-patterns:

- Don't extract a component for one consumer "just in case" — three similar lines beat a premature abstraction. Inline it until the second consumer appears.
- Don't pass deep prop chains to keep the same component reused across very different screens. Two focused components are easier to read than one props-bag component.
- Don't wrap a single `<button>` or `<div>` in a component just to rename a Tailwind class set. Use the class set directly.

When extracting, keep the new file small and focused: one default export per file, props typed inline with the component, motion/animation logic colocated with the markup. Generic primitives (`expandable-item`, `confirm-row`, `animated-list`, `skeleton`) live in `src/components/` next to the consumers — there is no separate `ui/` folder.

## Internationalization

Every visible string goes through `t(locale, key)` or `tf(locale, key, vars)` from `src/lib/i18n.ts`. Hardcoded JSX text is a bug.

- **Adding a key**: append to the `pt` object in `src/lib/i18n.ts` first (it defines the `TranslationKey` union), then add the same key to `en` with the equivalent string. TypeScript will fail the build if `en` is missing a key. Group keys by feature prefix (`auth.*`, `groups.*`, `settings.*`, `email.*`).
- **Interpolation**: use `tf(locale, 'key', { name, count })` with `{name}` / `{count}` placeholders in the string. Don't string-concatenate translated fragments — that breaks PT/EN word order.
- **Pluralization**: there are no ICU plural rules. When a count drives a different word, define both keys (`groups.memberCount` / `groups.memberCountPlural`) and pick at the call site. Don't invent a runtime helper for two cases.
- **Reading the locale**: client components read `state.locale` from the offline store. Server components and route handlers call `detectLocaleFromHeader(headersList.get('accept-language'))` once and pass the resolved `Locale` down — never read `headers()` deep in the tree.
- **Date/number formatting**: `Intl.DateTimeFormat(DATE_LOCALE[locale], …)` with the map exported from `i18n.ts`. Don't hardcode `'pt-BR'` or `'en'` at call sites.
- **Email templates**: same `t` / `tf` API, same key file. Subject, preview, body, and plain-text fallback all go through `i18n.ts` — no English-only fallbacks slipping through.
- **Brand strings**: the PWA name (`Aviões`), the manifest name, and the page `title` stay in Portuguese deliberately — they are the brand, not UI copy. Don't translate them.

## Security and data boundaries

The server is the only source of truth for who can read what. Treat every client claim as untrusted.

- **Never trust a client `userId` / `groupId`**. Every server action and route resolves the current user via better-auth (`auth.api.getSession({ headers })`) and re-derives the active group through `readGroupMembership(groupId, userId)`. The helpers in `src/lib/auth-guards.ts` (`requireUser`, `requireActiveGroup`, `requireGroupMember`, `requireGroupOwner`) are the canonical entry points; route guards and server actions both go through them.
- **Tenant-scoped reads only**. Reads that return group data go through `readGroupMembership` / `readGroupMembersForMember` / `readEventsForMember` so a non-member never gets back a group name, member list, or event row. Don't add a "raw" read that bypasses the membership check.
- **Sync revalidation**. `syncOps` re-checks the cookie identity, the active group membership, and the op shape on every batch. Add ops mismatching the server identity are settled-without-insert; delete ops only target rows owned by the caller. New op kinds must extend the same shape validation, not opt out of it.
- **Cookies and tokens**. Auth lives in `HttpOnly Secure SameSite=Lax` cookies issued by better-auth; client JS must not read them. Never put a bearer token, session id, or invite token in localStorage or IndexedDB. The offline store can hold a last-known display hint (identity, locale) but never anything that grants access.
- **Hashed sensitive tokens at rest**. Invitation tokens are stored as SHA-256 hashes; only the email + URL carry the plaintext. Apply the same pattern to any new short-lived secret (password-create / change tokens reuse the better-auth `verifications` table with prefixed identifiers).
- **Redact before render**. Public surfaces (the unauthenticated invite page, OAuth error pages) must redact group name, inviter info, and email mismatch hints unless the viewer is signed in **and** verified. Error messages that leak which email was invited are also a leak.
- **Rate-limit at the server**. Anything that emails or invites is rate-limited inside the same DB transaction (`pg_advisory_xact_lock`, partial unique indexes, hourly counters). Client throttles are UX, not security.
- **PII in logs**. Don't log raw emails, tokens, or invite URLs. The OTP dev-mode console log is the one deliberate exception, gated on missing `RESEND_API_KEY`.
- **Cron and webhooks**. Endpoints under `/api/cron/*` require `Authorization: Bearer ${CRON_SECRET}`. New scheduled or external endpoints follow the same pattern — there is no anonymous mutation surface.

## Tailwind v4

- Tailwind v4 detects classes by scanning source for static literals. **Never build class names by string concatenation** like `bg-${accent}`. The class won't be generated.
- For per-identity classes, use the static maps in `app/lib/types.ts` (`IDENTITIES.henrique.bg`, `.text`, etc.).
- Custom theme tokens go in `app/globals.css` under `@theme inline` and are exposed via CSS variables in `:root` / `[data-theme="dark"]`.
- Prefer arbitrary values (`text-[11px]`) over inventing new theme tokens for one-off sizes.

## Comments

- Default to no comments. Names should carry the meaning.
- Add a one-line comment only when the _why_ is non-obvious — a workaround, a hidden constraint, a non-trivial invariant. Never explain _what_ the code is doing.
- No JSDoc blocks. No "Added for X" or "Used by Y" comments.

## Imports

- Use the `@/*` path alias for cross-tree imports if a file is more than two levels away. Relative imports inside `app/` are fine for sibling files.
- Group order: standard / framework, third-party, local. No blank lines required between groups; let the formatter sort.

## Errors and validation

- Trust the boundaries we have. Server Actions validate the small enums (`Identity`, `Theme`) and silently no-op on bad input. We do not throw.
- No `try/catch` for "just in case." Catch only when there is something specific to do (e.g. SW registration failure → swallow silently because it's optional).

## Tests

Tests use Vitest for deterministic, browser-free logic. Add tests when a behavior depends on op ordering, persistence migration, or derived projections.

- Run on Node (no browser) for `lib/streaks.ts`, `lib/cookies.ts` parsing, `lib/offline-model.ts`, and persistence migration helpers.
- Use Playwright or Storybook interaction tests for the counter flow if/when it grows.

## Commit messages

- Conventional Commits: `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`, `build`, `ci`, `style`.
- Subject ≤50 chars when possible, hard cap 72.
- Body only when the _why_ is not in the diff. Wrap at 72.
- No emoji, no AI attribution, no "this commit does X".
