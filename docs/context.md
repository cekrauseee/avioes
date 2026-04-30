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

### 2026-04-30 — Initial documentation harness
Set up `README.md`, `docs/`, `AGENTS.md`. Source code switched to English-only (routes renamed from `/diario` → `/diary` and `/placar` → `/scoreboard`; UI labels stay Brazilian Portuguese). SW cache version bumped to `avioes-v2` because the precache list changed.

### 2026-04-30 — Mobile-only design frame
The whole app is wrapped in a 420px-wide centered column. Desktop renders as a phone-shaped frame, not a wide layout. Tightened typography sizes across all screens. See `docs/ui-ux.md`.

### 2026-04-30 — Labels: simple, not modernist
Replaced `uppercase tracking-[0.2em]` mono labels with plain `text-xs text-ink-faint` (or `text-[11px]` for timestamps). Mono is reserved for actual numerals. See `docs/ui-ux.md` ("Typography").

### 2026-04-30 — Cookie storage with cap
Events stored in cookie `av_events` using compact CSV (`h:<ts>,p:<ts>`). Hard-capped at 1000 events in `app/lib/cookies.ts`. If this cap becomes a real concern, migrate to `localStorage` — don't try to compress further.

### 2026-04-30 — Optimistic counter via `useOptimistic`
Counter uses React 19's `useOptimistic` for both the per-person count and the global total. Wrapped in `startTransition`; the Server Action's `revalidatePath` is what reconciles. Avoids the `set-state-in-effect` lint rule.

### 2026-04-30 — Placeholder illustrations
All illustration slots use `<Placeholder/>` (dashed border, hatch, small label). Real drawings will swap the component, not the call sites.
