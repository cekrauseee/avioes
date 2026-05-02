# Project

## What it is

Airplanes is a personal, two-person airplane-counting game (visible to users in Portuguese as "Aviões"). When Henrique and Pietra are together and see an airplane in the sky, the person who spotted it taps the screen. The app keeps three views over those taps:

1. **Counter** — the home screen. A single big number for the active person, a smaller number for the partner, a tap zone that increments by one.
2. **Diário** (diary) — a chronological log of "streaks": consecutive sightings by the same person collapse into one entry. A streak ends when the other person taps.
3. **Placar** (scoreboard) — totals, the leader, longest streaks, and the most recent streaks.

The identity ("Henrique" or "Pietra") is picked once per device during onboarding and stored as a cookie. The cookie just selects which of the two hardcoded users this device is acting as — events and theme themselves live in Postgres, so opening the app from a different device and picking the same identity shows the same data.

## What it is not

- Not an account system. The two users are hardcoded (`henrique`, `pietra`); there's no signup, no auth, no third user.
- Not a generic counter. The two-identity, streak-based diary is the entire point.
- Not designed for desktop. Desktop renders a centered phone-width frame, but the design target is mobile.

## Constraints

- **Storage**: identity is the only cookie (`ap_id`, picks which of the two hardcoded users this device is). Airplane events and per-user theme live in Postgres via Drizzle, keyed by the user. Local dev uses `node-postgres` against the `docker-compose.yaml` container; production uses `@neondatabase/serverless`.
- **Language**: UI is in Brazilian Portuguese. Code, identifiers, file paths, and documentation are in English. URL slugs follow code (so `/diary` and `/scoreboard`, not `/diario` / `/placar`), even though the visible nav labels are Portuguese.
- **Routing**: routes are static client shells. Critical state comes from the browser's offline store; Server Actions bootstrap and sync canonical Postgres state. `cookies()` is async in Next.js 16.
- **Offline**: the PWA caches the app shell. Events/theme live in IndexedDB as a canonical snapshot plus ordered pending ops, then replay through Server Actions on reconnect. localStorage only stores a tiny boot hint (`ap_boot`) for identity/theme display; it is not auth.

## Roadmap (not promises)

- Replace placeholder illustrations with real drawings (the `<Placeholder/>` component is the seam).
- Custom hand-drawn airplane glyphs for the arc animation.
- Optional: per-day grouping in the diary.
