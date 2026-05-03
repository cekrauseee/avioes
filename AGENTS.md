# AGENTS.md

Read this first if you are an AI agent (or a human dropped in cold) about to make changes to this repo.

## What this project is

Airplanes is a tiny PWA: a two-person airplane-counting game. Identity is picked once per device via onboarding (cookie). Taps add airplane events. Three views: counter, diary, scoreboard. State for the two hardcoded users (`henrique`, `pietra`) lives in Postgres so it follows the user across devices; only the identity selector is per-device.

The codebase, project name, and infra are English. The UI is Brazilian Portuguese — the visible PWA name is "Aviões" and on-screen copy stays in PT.

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
| See what's been decided recently and why               | [`docs/context.md`](./docs/context.md)           |
| Pick up or leave known deferred work                   | [`docs/backlog.md`](./docs/backlog.md)           |

## Hard rules

- **Source code is English. UI strings are Brazilian Portuguese.** Routes follow the source code (`/diary`, `/scoreboard`). Visible nav labels are Portuguese. Don't mix.
- **Two hardcoded users.** Don't add auth, signup, or arbitrary user creation. The identity union stays `'henrique' | 'pietra'`.
- **Persistence is Postgres via Drizzle.** Schema lives in `src/lib/db/schema.ts`. Reads/writes go through `src/lib/store.ts`. `src/lib/db/index.ts` switches between `node-postgres` (dev) and `@neondatabase/serverless` (prod, when `VERCEL=1`). Schema changes are applied with `npm run db:push` — no migration files are generated.
- **Identity is the only cookie.** `ap_id` (`'henrique' | 'pietra'`) selects who is using the device. Events and per-user theme live in Postgres, keyed by `who`.
- **Don't break Tailwind class detection.** No string-concatenated class names. Use the `IDENTITIES` map for per-person colors.
- **No `useEffect` to mirror props into state.** Use `useOptimistic` or render directly from props. The lint rule `react-hooks/set-state-in-effect` is a tripwire for this mistake.
- **Mutations go through Server Actions** in `src/actions.ts`. Server Components don't write cookies and don't write to the DB directly outside of `store.ts`.
- **No tests speculatively, no comments speculatively, no abstractions speculatively.** Default to fewer files, fewer indirections.

## Workflow expectations

1. Before changing code, read [`docs/context.md`](./docs/context.md). It tells you what's currently in flight or freshly decided.
2. After landing a non-trivial change, update [`docs/context.md`](./docs/context.md): add an entry for what's new, remove stale entries that your change made obsolete. The whole file should still fit on one screen.
3. Use [`docs/backlog.md`](./docs/backlog.md) for known follow-ups that are deliberately not part of the current session. Add an entry only when it is specific, prioritized, and has a clear "done" condition. Remove entries when they are completed, obsolete, or promoted into stable docs.
4. If a fact has been true for more than a few weeks and is now stable, promote it from `context.md` into the matching `docs/*.md` and delete it from `context.md`.
5. Commits follow Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `chore`, …). Subject ≤50 chars when possible. Body only when _why_ is non-obvious. No AI attribution in commit messages.

## Local dev setup

1. `npm run db:up` — `docker compose up -d`, starts Postgres on `localhost:5432` (matches `.env.example`).
2. `cp .env.example .env.local` if you don't have one.
3. `npm run db:push` — applies the Drizzle schema. Re-run whenever `src/lib/db/schema.ts` changes.
4. `npm run dev`.

`npm run db:studio` opens Drizzle Studio if you need to peek at rows.

## Verification before declaring done

- `npm run build` passes.
- `npm run lint` passes.
- Local Postgres is running and `npm run db:push` is clean (no pending schema diff).
- For UI changes: open `npm run dev` and exercise the actual flow on a mobile-width viewport. Tests don't exist yet, so visual verification is the only check.
- For PWA changes: test with a production build (`npm run build && npm run start`). The service worker cache name is tied to Next's `BUILD_ID` in `src/app/sw.js/route.ts`; there is no manual `CACHE` bump.

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
