# AGENTS.md

Read this first if you are an AI agent (or a human dropped in cold) about to make changes to this repo.

## What this project is

Aviões is a tiny PWA: a two-person airplane-counting game shared on a single mobile device. Identity is picked once via onboarding (cookie). Taps add airplane events. Three views: counter, diary, scoreboard. No backend — cookies are the database.

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

## Hard rules

- **Source code is English. UI strings are Brazilian Portuguese.** Routes follow the source code (`/diary`, `/scoreboard`). Visible nav labels are Portuguese. Don't mix.
- **No backend.** Don't add a database, an API route for mutations, or a third-party storage SDK. Cookies are the entire data layer.
- **Don't break Tailwind class detection.** No string-concatenated class names. Use the `IDENTITIES` map for per-person colors.
- **No `useEffect` to mirror props into state.** Use `useOptimistic` or render directly from props. The lint rule `react-hooks/set-state-in-effect` is a tripwire for this mistake.
- **Mutations go through Server Actions** in `app/actions.ts`. Server Components don't write cookies.
- **No tests speculatively, no comments speculatively, no abstractions speculatively.** Default to fewer files, fewer indirections.

## Workflow expectations

1. Before changing code, read [`docs/context.md`](./docs/context.md). It tells you what's currently in flight or freshly decided.
2. After landing a non-trivial change, update [`docs/context.md`](./docs/context.md): add an entry for what's new, remove stale entries that your change made obsolete. The whole file should still fit on one screen.
3. If a fact has been true for more than a few weeks and is now stable, promote it from `context.md` into the matching `docs/*.md` and delete it from `context.md`.
4. Commits follow Conventional Commits (`feat`, `fix`, `refactor`, `docs`, `chore`, …). Subject ≤50 chars when possible. Body only when _why_ is non-obvious. No AI attribution in commit messages.

## Verification before declaring done

- `npm run build` passes.
- `npm run lint` passes.
- For UI changes: open `npm run dev` and exercise the actual flow on a mobile-width viewport. Tests don't exist yet, so visual verification is the only check.
- For PWA changes: bump the `CACHE` version in `public/sw.js`, then test with a production build (`npm run build && npm run start`).

## Multi-agent coordination

This repo is intended to be worked on by multiple agent sessions. The single source of truth for "what's currently happening" is [`docs/context.md`](./docs/context.md). Treat it as a shared scratchpad:

- Read it at the start of every session.
- Update it before ending a session if you changed anything non-trivial.
- Keep entries terse — date + one-line title + a few lines of body. Promote stable items to `docs/*.md`.

If two agents work in parallel, the human user is the merge oracle. Don't try to coordinate via long-lived plan files in the repo.
