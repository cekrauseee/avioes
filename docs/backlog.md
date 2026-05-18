# Backlog

Known follow-ups that are not part of the current session. This file is for concrete deferred work, not active coordination, release notes, or a product roadmap.

Use [`docs/context.md`](./context.md) for what is currently in flight or freshly decided. Use this file when a review or implementation leaves a real issue, cleanup, or investigation intentionally out of scope. Cross-cutting conventions belong in the matching `docs/*.md` (architecture, code-style, ui-ux, images), not here.

## Maintaining This File

Keep entries short but executable. A future agent should understand why the item exists, why it was not done immediately, and what "done" means.

- Add an entry only when the follow-up is specific and worth preserving.
- Update an existing entry instead of adding duplicates.
- Remove entries when they are done, obsolete, or promoted into another `docs/*.md` file as stable project guidance.
- Do not use this file for current session status; put that in `docs/context.md`.
- Keep priority honest: `P1` blocks correctness or release, `P2` is important cleanup or missing coverage, `P3` is opportunistic polish.

## Format

```md
### P2 — Short title

Area: offline sync
Why: One or two sentences explaining the risk or opportunity.
Trigger: When to pick this up.
Done: Observable completion criteria.
```

---

## Open

### P2 — Consolidate offline validators

Area: offline sync
Why: `offline-db.ts` and `offline-store.ts` both validate identities, themes, and event shapes. The duplicate guards are small today, but they can drift as the offline payload evolves.
Trigger: Next change that touches offline persistence, BroadcastChannel payloads, or event/theme validation.
Done: Shared local validators are used by both modules, with existing tests still passing.

### P2 — Cover offline edge cases with tests

Area: offline sync
Why: The important behavior is easy to regress: BroadcastChannel must not share `pendingOps`, and old forged add-event timestamps must settle without writing events.
Trigger: Next test pass around offline sync or any refactor of `actions.ts` / `offline-store.ts`.
Done: Tests cover the BroadcastChannel payload whitelist and timestamp rejection behavior.

### P3 — Document replay timestamp window in code

Area: server actions
Why: `MAX_PAST_TS_MS` is a deliberate anti-abuse and clock-skew bound. Legitimate queues older than seven days settle and disappear, so the tradeoff should be visible next to the constant.
Trigger: Next change to sync validation.
Done: A short comment explains the seven-day offline replay window and settlement behavior.

### P3 — Consider sync retry backoff

Area: offline sync
Why: Pending sync retries every five seconds while failures continue. The mutex prevents parallel drains, but flaky networks could still cause unnecessary server traffic.
Trigger: If flaky-network behavior becomes noisy in practice, or if sync status gains richer retry state.
Done: Retry delay backs off on sustained failure, with a small cap and no parallel drains.

### P3 — Replace intro carousel placeholders with real illustrations

Area: imagery
Why: The intro carousel (`apps/web/src/components/intro.tsx`) still renders three `<Placeholder/>` slots (`page1.artLabel`, `page2.artLabel`, `page3.artLabel`). Every other empty/error/welcome surface ships hand-drawn art; the intro is the last hatched-dashed stand-in shipping in production.
Trigger: Next time we touch onboarding, or when the post-launch art batch is queued.
Done: Three new PNG pairs (`intro-1-{light,dark}.png`, etc.) generated via the `docs/images.md` template, wired through `theme-light-only` / `theme-dark-only`, added to `OFFLINE_ASSETS`, and `<Placeholder/>` removed from `apps/web/src/components/intro.tsx`. The component file `apps/web/src/components/placeholder.tsx` can be deleted once the carousel is migrated.
