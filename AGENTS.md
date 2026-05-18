# AGENTS.md

Read this first if you are an AI agent (or a human dropped in cold) about to make changes to this repo.

## What this project is

Aviões is a small PWA: a group-based airplane-counting game. Users authenticate with better-auth (email + password, OTP, passkey, Google), join one or more groups, and tap to register airplane events scoped to the active group. Three views per group: counter, diary, scoreboard. Canonical state lives in Postgres; the browser keeps an offline IndexedDB snapshot and ordered pending-op queue.

The repo is a **Turborepo monorepo** with two apps (`apps/web` for the PWA, `apps/backoffice` for admin) and four shared packages (`packages/auth`, `packages/db`, `packages/i18n`, `packages/types`). Package imports use `@airplanes/*` (e.g. `@airplanes/db/store`, `@airplanes/auth/guards`).

The codebase and infrastructure use English naming. The UI is fully internationalized — Brazilian Portuguese is the default, English ships alongside it. The visible PWA name is "Aviões" because it is the brand.

The full picture is in [`README.md`](./README.md) and [`docs/project.md`](./docs/project.md).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

The repo runs on **Next.js 16.2.4** with **React 19** and **Tailwind v4**. Several APIs have breaking changes from training data:

- `cookies()` is **async**. Always `await cookies()`.
- Dynamic route `params` is a `Promise`.
- Tailwind config uses `@import "tailwindcss"` and `@theme inline` — there is no `tailwind.config.js`.
- Cookie writes can only happen in Server Actions or Route Handlers, never during Server Component render.

Before writing non-trivial code, skim the relevant doc inside `node_modules/next/dist/docs/01-app/` rather than relying on memory. The two most useful files are:

- `01-app/03-api-reference/04-functions/cookies.md`
- `01-app/01-getting-started/05-server-and-client-components.md`
<!-- END:nextjs-agent-rules -->

## Where to look before coding

| You want to…                                           | Read                                             |
| ------------------------------------------------------ | ------------------------------------------------ |
| Understand the product and its boundaries              | [`docs/project.md`](./docs/project.md)           |
| Trace data flow, routes, server actions, cookies       | [`docs/architecture.md`](./docs/architecture.md) |
| Match the conventions of the codebase                  | [`docs/code-style.md`](./docs/code-style.md)     |
| Touch anything visual (palette, fonts, layout, motion) | [`docs/ui-ux.md`](./docs/ui-ux.md)               |
| Add, replace, or request a new illustration            | [`docs/images.md`](./docs/images.md)             |
| See what's been decided recently and why               | [`docs/context.md`](./docs/context.md)           |
| Pick up or leave known deferred work                   | [`docs/backlog.md`](./docs/backlog.md)           |

## Hard rules

- **Source code is English. UI strings flow through `t(locale, key)`.** Routes follow the source code (`/diary`, `/scoreboard`). Hardcoded JSX text is a bug — every visible string lives in `packages/i18n/src/index.ts`, with `pt` defining the key set and `en` mirroring it. Brand strings (`Aviões`, manifest name, page title) stay in Portuguese on purpose.
- **Auth is better-auth, multi-tenant by group.** Don't reintroduce hardcoded identities. Every server action and route resolves the user via `auth.api.getSession({ headers })` and re-derives membership through `requireUser` / `requireActiveGroup` / `requireGroupMember` / `requireGroupOwner` in `packages/auth/src/guards.ts`. Trust nothing the client sends as `userId` / `groupId`.
- **Persistence is Postgres via Drizzle.** Schema lives in `packages/db/src/schema.ts`. Reads/writes go through `packages/db/src/store.ts` and use membership-scoped queries (`readGroupMembership`, `readGroupMembersForMember`, `readEventsForMember`). `packages/db/src/index.ts` switches between `node-postgres` (dev) and `@neondatabase/serverless` (prod, when `VERCEL=1`). **Schema changes use migrations, not `db:push`.** After editing `schema.ts`, run `npm run db:generate` to create a migration in `packages/db/drizzle/`, then `npm run db:migrate` to apply locally. For production, run `DATABASE_URL=<prod-url> npm run db:migrate`. The `db:push` script still exists for bootstrapping fresh dev databases but must never be used against production. See "Database operations" below.
- **Cookies are `HttpOnly Secure SameSite=Lax` only.** No bearer token, session id, invite token, or password-reset token in localStorage / IndexedDB. Sensitive tokens are stored hashed at rest (SHA-256).
- **Don't break Tailwind class detection.** No string-concatenated class names. Use the `MEMBER_COLORS` array + `getMemberColor` helper (from `@airplanes/types`) for per-member accents; per-palette tokens are CSS variables driven by `[data-palette]` selectors in `apps/web/src/app/globals.css`.
- **No `useEffect` to mirror props into state.** Use `useOptimistic`, the offline store (`useSyncExternalStore`), or render directly from props. The lint rule `react-hooks/set-state-in-effect` is a tripwire.
- **Mutations go through Server Actions** in `apps/web/src/actions.ts`. Server Components don't write cookies and don't write to the DB directly outside of `store.ts`. Every new op kind extends the same shape + identity validation `syncOps` already enforces.
- **Illustrations are part of the product.** When a new screen needs art, request the PNG from Codex using the prompt template in [`docs/images.md`](./docs/images.md), drop it into `apps/web/public/`, render it as a `theme-light-only` / `theme-dark-only` pair, and add the path to `OFFLINE_ASSETS` in `apps/web/src/app/sw.js/route.ts`. Don't ship a `<Placeholder/>` outside the intro carousel.
- **No tests speculatively, no comments speculatively, no abstractions speculatively.** Default to fewer files, fewer indirections. Componentize only when a pattern repeats or owns its own non-trivial behaviour — see the Componentization section in [`docs/code-style.md`](./docs/code-style.md).

## Workflow expectations

1. Before changing code, read [`docs/context.md`](./docs/context.md). It tells you what's currently in flight or freshly decided.
2. After landing a non-trivial change, update [`docs/context.md`](./docs/context.md): add an entry for what's new, remove stale entries that your change made obsolete. The whole file should still fit on one screen.
3. Use [`docs/backlog.md`](./docs/backlog.md) for known follow-ups that are deliberately not part of the current session. Add an entry only when it is specific, prioritized, and has a clear "done" condition. Remove entries when they are completed, obsolete, or promoted into stable docs.
4. If a fact has been true for more than a few weeks and is now stable, promote it from `context.md` into the matching `docs/*.md` and delete it from `context.md`.
5. Commits follow Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `chore`, …). Subject ≤50 chars when possible. Body only when _why_ is non-obvious. No AI attribution in commit messages.

## Local dev setup

1. `npm run db:up` — `docker compose up -d`, starts Postgres on `localhost:5432` (matches `.env.example`).
2. `cp .env.example .env.local` if you don't have one.
3. `npm run db:migrate` — applies pending Drizzle migrations. For a brand-new dev database you can also use `npm run db:push` to bootstrap all tables at once.
4. `npm run dev`.

`npm run db:studio` opens Drizzle Studio if you need to peek at rows.

## Database operations

The app is in production on Neon. **Never run `db:push` against production** — it can drop columns/tables without warning.

| Task                   | Command                                  | Notes                                                                   |
| ---------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| Edit schema            | Edit `packages/db/src/schema.ts`         | —                                                                       |
| Generate migration     | `npm run db:generate`                    | Creates a SQL file in `packages/db/drizzle/`. Review before committing. |
| Apply locally          | `npm run db:migrate`                     | First run auto-bootstraps the baseline.                                 |
| Apply to production    | `DATABASE_URL=<prod> npm run db:migrate` | Same script; baseline is auto-detected.                                 |
| Bootstrap fresh dev DB | `npm run db:push`                        | Local dev only. Faster than migrations for empty DBs.                   |

The migration script (`packages/db/scripts/migrate.ts`) auto-detects first-time runs: it marks the baseline migration (0000) as already applied so existing tables aren't recreated. Subsequent migrations apply normally. Always review generated SQL before committing — Drizzle may generate destructive operations (column drops, type changes) that need manual adjustment.

## Verification before declaring done

- `npm run build` passes.
- `npm run lint` passes.
- Local Postgres is running and `npm run db:migrate` is clean (no pending migrations).
- For UI changes: open `npm run dev` and exercise the actual flow on a mobile-width viewport. Tests don't exist yet, so visual verification is the only check.
- For PWA changes: test with a production build (`npm run build && npm run start`). The service worker cache name is tied to Next's `BUILD_ID` in `apps/web/src/app/sw.js/route.ts`; there is no manual `CACHE` bump.

## Multi-agent coordination

This repo is intended to be worked on by multiple agent sessions. The single source of truth for "what's currently happening" is [`docs/context.md`](./docs/context.md). The source of truth for deferred, not-currently-active work is [`docs/backlog.md`](./docs/backlog.md).

Treat `context.md` as a shared scratchpad:

- Read it at the start of every session.
- Update it before ending a session if you changed anything non-trivial.
- Keep entries terse — date + one-line title + a few lines of body. Promote stable items to `docs/*.md`.

Treat `backlog.md` as a short queue, not a plan file:

- Add only concrete follow-ups with priority, rationale, trigger, and done condition.
- Update or delete old entries instead of letting stale backlog accumulate.
- Do not use backlog entries to coordinate active parallel work; use `context.md` and the human merge oracle.

If two agents work in parallel, the human user is the merge oracle. Don't try to coordinate via long-lived plan files in the repo.
