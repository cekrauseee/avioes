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
