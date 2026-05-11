# UI / UX guidelines

## Direction

The app should feel like a small paper journal carried in a pocket — warm, hand-pressed, slightly imperfect. It is _not_ a SaaS dashboard. It is _not_ a slick fintech app. The two people using it are the audience; nobody else is.

Three words to keep in mind: **simple**, **organic**, **calm**.

## Layout

- The primary target is mobile, in portrait. Desktop is supported but is not the focus.
- The whole app is wrapped in a 420px-wide centered column with thin side borders. On a phone this is full-width; on desktop it looks like a phone-shaped frame on the page.
- Each screen is a fixed view: the body has `overflow: hidden` and `overscroll-behavior: none`. Long screens (diary, scoreboard) scroll inside `.scroll-area`, which uses `overscroll-behavior: contain`. The browser bg never shows when you over-pull.
- Respect `env(safe-area-inset-*)` on top and bottom paddings.

## Palette

Defined as CSS variables in `app/globals.css`. Light is the default; dark applies via `[data-theme="dark"]` or `prefers-color-scheme: dark` when the cookie is `system`.

| Token         | Light       | Dark        | Use                                  |
| ------------- | ----------- | ----------- | ------------------------------------ |
| `--bg`        | `#F6F1E7`   | `#15191B`   | Page background (warm paper / night) |
| `--bg-soft`   | `#EFE8D8`   | `#1D2225`   | Bottom nav, subtle surfaces          |
| `--ink`       | `#1F2A24`   | `#EDE6D6`   | Primary text                         |
| `--ink-soft`  | `#4A5A52`   | `#B8B0A0`   | Secondary text                       |
| `--ink-faint` | `#8A9890`   | `#6E6A60`   | Labels, timestamps                   |
| `--sage`      | `#7C9A82`   | `#9CB6A1`   | Henrique's accent                    |
| `--clay`      | `#C97B5C`   | `#E59A7E`   | Pietra's accent                      |
| `--sky`       | `#A8C3D4`   | `#6E8FA3`   | Subtle accents, dividers             |
| `--line`      | `#1F2A2418` | `#EDE6D622` | Hairlines and borders                |
| `--paper`     | `#FFFFFF80` | `#1D222540` | Card surfaces                        |

Per-identity classes (e.g. `bg-sage`, `text-clay`) come from the `IDENTITIES` map in `app/lib/types.ts`. Never build them by string concatenation — Tailwind won't pick them up.

### Palettes

Six palettes (`default`, `ocean`, `lavender`, `earth`, `blossom`, `sky`) redefine all CSS color tokens. Each palette has both light and dark variants, applied via `[data-palette="X"]` selectors in `globals.css`. The active palette is stored per-user in Postgres and synced offline. Metadata for the palette picker lives in `PALETTES` in `app/lib/types.ts`.

## Typography

- **Display**: `Fraunces` (Google) with `SOFT` and optical-sizing axes. Used for the app name, big counter, page headings, and softly italic flourishes.
- **Body**: `Geist Sans`. Used for almost everything else.
- **Mono**: `Geist Mono`. Used only for actual numerals — timestamps, counts inside a sentence ("viu 3 aviões"). Not used for labels.

Labels (timestamps, helper text under a number, "trocar", "desfazer") are rendered as natural lowercase sans, **not** as uppercase tracked-out modernist labels. If you find yourself writing `uppercase tracking-[0.2em]`, that's a smell — fall back to plain `text-xs text-ink-faint`.

## Components

- **`<Noise/>`** is a fixed full-screen SVG `feTurbulence` overlay at very low opacity. It gives the paper grain. Don't tune the opacity per-screen.
- **`<AppShell/>`** wraps a screen with the bottom nav and theme toggle. Auth, onboarding, intro, and offline gates render without the shell.
- **`<Placeholder/>`** is the dashed-hatch stand-in still used by the intro carousel for slots that don't have hand-drawn art yet. It is **not** for new screens — every other empty/error/welcome surface ships a real PNG. When you build a new feature, request a real illustration (see below) instead of reaching for `Placeholder`.
- Generic list/action primitives live alongside the screens that consume them: `expandable-item.tsx`, `confirm-row.tsx`, `animated-list.tsx`, `skeleton.tsx`. Reuse those before inventing new wrappers.

## Imagery

Illustrations carry as much of the product feel as the typography does. Treat them as first-class UI, not decoration.

- **Use real images for empty/error/welcome moments.** Counter, diary, and scoreboard empty states; the 404, 500, splash, offline, and OAuth error screens; the auth welcome and invite flows — all have hand-drawn PNGs already wired up. New equivalents should follow the same pattern instead of falling back to glyph emoji or text-only screens.
- **Light/dark pairs always.** Render with `next/image` (`unoptimized`) inside `theme-light-only` / `theme-dark-only` wrappers. Don't filter or invert a single PNG to fake the dark version — generate both.
- **Theme-aware preloading.** When an image triggers on interaction (tap fly-by, post-action confirmation), preload both variants so the dark/light swap is invisible. `counter.tsx` shows the pattern.
- **Add to `OFFLINE_ASSETS`.** Any user-facing PNG must live in the precache list in `src/app/sw.js/route.ts`, otherwise empty/error states break offline.
- **Custom SVG icons only.** `src/components/icons.tsx` is the single icon set — stroke-based, 1.7 stroke-width, `currentColor`, organic feel. No external icon libraries. New icons follow the same `I()` base wrapper pattern. Use them in `leading`/`trailing` Button props for navigation hints (arrows, chevrons) and semantic cues (lock, key, users, etc.).

The full catalog, the visual contract every illustration follows, and the prompt template for requesting new art live in [`docs/images.md`](./images.md). When a feature needs new art, do not generate it inline — author the prompt, hand it to Codex with the file name and target location, and wire the returned PNG.

## Motion and navigation

The app uses Motion (framer-motion v12). Animation should make the journey feel calm and intentional — never busy.

### Page transitions

- `src/app/template.tsx` owns route enter motion: a short opacity fade with a light 24 px directional slide and 4 px blur. `src/components/swipeable-content.tsx` owns gestures only.
- Lateral navigation between `/`, `/diary`, `/scoreboard`, `/settings` is a single horizontal swipe (touch + trackpad wheel + Left/Right arrow). The handler in `src/lib/horizontal-wheel-navigation.ts` accumulates per-gesture and locks until input settles, so one trackpad gesture advances exactly one page. Settings tabs reuse the same path so swipes feel uniform across the app.
- Use Motion `dragDirectionLock` on swipeable wrappers so vertical list scroll and horizontal page navigation can coexist without fighting.
- Motion timing, easing, offsets, and springs live in `src/lib/motion.ts`. New Motion surfaces should reuse `MOTION_TRANSITION`, `MOTION_OFFSET`, `MOTION_SPRING`, and `withMotionDelay()` instead of declaring local timing objects.

### Component motion

- **Counter spring**: `stiffness: 220, damping: 22`. Don't change without a reason.
- **Plane arc**: the one piece of celebratory motion. Keep it under 1.7 s and cap in-flight planes at ≤3.
- **List add/remove**: use `animated-list.tsx` (`AnimatePresence mode='popLayout'` by default) so removed rows fade while siblings reflow with position-only layout. Bottom sheets containing these lists must opt into position-only layout too, so the sheet top moves by transform as the content shrinks.
- **Confirm rows**: use `confirm-row.tsx`. Exiting rows are popped absolute during fade so opacity and panel-height transitions start together — don't roll your own destructive-confirm grid.
- **Bottom sheets**: portal + Motion entry/exit (`account-sheet`, `connections-sheet`, `passkeys-sheet`, `invite-share-sheet` all share the pattern). Open with a quick spring, close with a softer ease, never bounce.

### Restraint

- Keep page-load animation to a single staggered fade-up; don't sprinkle micro-interactions everywhere.
- Respect `prefers-reduced-motion`. If you add a new motion surface, it must degrade to a static state under reduced-motion — not a faster animation.
- No parallax, no looping ambient motion, no attention-getting bounces. The journal aesthetic does not move on its own.

## Don'ts

- Don't add gradients, shadows, or glassmorphism. The aesthetic is matte paper.
- Don't introduce external icon libraries. Use `src/components/icons.tsx` for all inline icons; use the hand-drawn PNG set for anything bigger.
- Don't add a desktop-specific layout. Desktop is a centered phone frame.
- Don't add an "About" or "Help" page. The app is its own help.
- Don't ship a new screen with a `<Placeholder/>` where a real illustration belongs. Either reuse an existing PNG, or request a new one via [`docs/images.md`](./images.md).
