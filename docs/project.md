# Project

## What it is

Airplanes is a group airplane-counting game (visible to users in Portuguese as "Aviões"). When a group of people are together and see an airplane in the sky, the person who spotted it taps the screen. The app keeps three views over those taps:

1. **Counter** — the home screen. A single big number for the active person, a smaller number for everyone else combined, a tap zone that increments by one.
2. **Diário** (diary) — a chronological log of "streaks": consecutive sightings by the same person collapse into one entry. A streak ends when someone else taps.
3. **Placar** (scoreboard) — totals, the leader, longest streaks, and the most recent streaks.

Users authenticate with email and password (better-auth). The same flow handles both sign-in and sign-up: if the email exists, the user is logged in; if not, an account is created. After authentication, the user selects or creates a **group** to start counting. Each user can belong to multiple groups. Within a group, the `owner` can add members by email and remove non-owner members.

## What it is not

- Not a generic social platform. Groups are small, personal, and invite-only (no public discovery).
- Not a generic counter. The group-based, streak-based diary is the entire point.
- Not designed for desktop. Desktop renders a centered phone-width frame, but the design target is mobile.

## Constraints

- **Auth**: better-auth with email+password. Session token stored in an httpOnly cookie by better-auth. Env vars needed: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`.
- **Storage**: Airplane events are group-scoped in Postgres (`events.group_id`). Per-user preferences (theme, palette, locale, active group) live in the `preferences` table. Local dev uses `node-postgres` against the `docker-compose.yaml` container; production uses `@neondatabase/serverless`.
- **Language**: UI is in Brazilian Portuguese. Code, identifiers, file paths, and documentation are in English. URL slugs follow code (so `/diary` and `/scoreboard`), even though the visible nav labels are Portuguese.
- **Routing**: routes are static client shells. Critical state comes from the browser's offline store; Server Actions bootstrap and sync canonical Postgres state.
- **Offline**: the PWA caches the app shell. Events/preferences live in IndexedDB as a canonical snapshot plus ordered pending ops, then replay through Server Actions on reconnect.

## Roadmap (not promises)

- Custom hand-drawn airplane glyphs for the arc animation.
- Optional: per-day grouping in the diary.
- Optional: invite links so owners can share a group without knowing a member's email in advance.
