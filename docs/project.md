# Project

## What it is

Aviões is a personal, two-person airplane-counting game. When Henrique and Pietra are together and see an airplane in the sky, the person who spotted it taps the screen. The app keeps three views over those taps:

1. **Counter** — the home screen. A single big number for the active person, a smaller number for the partner, a tap zone that increments by one.
2. **Diário** (diary) — a chronological log of "streaks": consecutive sightings by the same person collapse into one entry. A streak ends when the other person taps.
3. **Placar** (scoreboard) — totals, the leader, longest streaks, and the most recent streaks.

The identity ("Henrique" or "Pietra") is picked once during onboarding and stored as a cookie on the device. Both people share the same device — they are not on separate phones.

## What it is not

- Not multi-user / multi-device. There is no account system, no sync, no server-side database.
- Not a generic counter. The two-identity, streak-based diary is the entire point.
- Not designed for desktop. Desktop renders a centered phone-width frame, but the design target is mobile.
- Not a long-term archive. Events are stored in a cookie, capped at 1000.

## Constraints

- **Storage**: identity, events, and theme all live in browser cookies. The events cookie uses a compact format (`h:1714500000,p:1714500200`) to fit inside the 4KB cookie limit. There is no backend.
- **Language**: UI is in Brazilian Portuguese. Code, identifiers, file paths, and documentation are in English. URL slugs follow code (so `/diary` and `/scoreboard`, not `/diario` / `/placar`), even though the visible nav labels are Portuguese.
- **Routing**: routes are read-then-write. Server Components read cookies; Server Actions are the only place that mutates cookies. `cookies()` is async in Next.js 16.
- **Offline**: a minimal service worker caches the app shell so the PWA opens offline. Mutations require the page to be live (Server Actions need a request).

## Roadmap (not promises)

- Replace placeholder illustrations with real drawings (the `<Placeholder/>` component is the seam).
- Custom hand-drawn airplane glyphs for the arc animation.
- Optional: migrate events from cookie to `localStorage` if the cap becomes a real concern.
- Optional: per-day grouping in the diary.
