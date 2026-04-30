# UI / UX guidelines

## Direction

The app should feel like a small paper journal carried in a pocket — warm, hand-pressed, slightly imperfect. It is *not* a SaaS dashboard. It is *not* a slick fintech app. The two people using it are the audience; nobody else is.

Three words to keep in mind: **simple**, **organic**, **calm**.

## Layout

- The primary target is mobile, in portrait. Desktop is supported but is not the focus.
- The whole app is wrapped in a 420px-wide centered column with thin side borders. On a phone this is full-width; on desktop it looks like a phone-shaped frame on the page.
- Each screen is a fixed view: the body has `overflow: hidden` and `overscroll-behavior: none`. Long screens (diary, scoreboard) scroll inside `.scroll-area`, which uses `overscroll-behavior: contain`. The browser bg never shows when you over-pull.
- Respect `env(safe-area-inset-*)` on top and bottom paddings.

## Palette

Defined as CSS variables in `app/globals.css`. Light is the default; dark applies via `[data-theme="dark"]` or `prefers-color-scheme: dark` when the cookie is `system`.

| Token        | Light       | Dark        | Use                                  |
| ------------ | ----------- | ----------- | ------------------------------------ |
| `--bg`       | `#F6F1E7`   | `#15191B`   | Page background (warm paper / night) |
| `--bg-soft`  | `#EFE8D8`   | `#1D2225`   | Bottom nav, subtle surfaces          |
| `--ink`      | `#1F2A24`   | `#EDE6D6`   | Primary text                         |
| `--ink-soft` | `#4A5A52`   | `#B8B0A0`   | Secondary text                       |
| `--ink-faint`| `#8A9890`   | `#6E6A60`   | Labels, timestamps                   |
| `--sage`     | `#7C9A82`   | `#9CB6A1`   | Henrique's accent                    |
| `--clay`     | `#C97B5C`   | `#E59A7E`   | Pietra's accent                      |
| `--sky`      | `#A8C3D4`   | `#6E8FA3`   | Subtle accents, dividers             |
| `--line`     | `#1F2A2418` | `#EDE6D622` | Hairlines and borders                |
| `--paper`    | `#FFFFFF80` | `#1D222540` | Card surfaces                        |

Per-identity classes (e.g. `bg-sage`, `text-clay`) come from the `IDENTITIES` map in `app/lib/types.ts`. Never build them by string concatenation — Tailwind won't pick them up.

## Typography

- **Display**: `Fraunces` (Google) with `SOFT` and optical-sizing axes. Used for the app name, big counter, page headings, and softly italic flourishes.
- **Body**: `Geist Sans`. Used for almost everything else.
- **Mono**: `Geist Mono`. Used only for actual numerals — timestamps, counts inside a sentence ("viu 3 aviões"). Not used for labels.

Labels (timestamps, helper text under a number, "trocar", "desfazer") are rendered as natural lowercase sans, **not** as uppercase tracked-out modernist labels. If you find yourself writing `uppercase tracking-[0.2em]`, that's a smell — fall back to plain `text-xs text-ink-faint`.

## Components

- **`<Placeholder/>`** is the temporary stand-in for illustrations. It has a dashed border, a 45° hatch pattern, and a small lowercase label. Use it everywhere a real drawing would go. Replace it with the real artwork by swapping the component, not by editing the consumers.
- **`<Noise/>`** is a fixed full-screen SVG `feTurbulence` overlay at very low opacity. It gives the paper grain. Don't tune the opacity per-screen.
- **`<AppShell/>`** wraps a screen with the bottom nav and theme toggle. Onboarding renders without the shell.

## Motion

- Use the `motion` package (framer-motion v12).
- Keep page-load animation to a single staggered fade-up; don't sprinkle micro-interactions everywhere.
- The counter number rolls with a spring (`stiffness: 220, damping: 22`). Don't change those values without a reason.
- The plane arc on tap is the one piece of celebratory motion. Keep it under 1.7s and trim the array of in-flight planes to ≤3.
- Respect `prefers-reduced-motion` if/when we add more animations.

## Don'ts

- Don't add gradients, shadows, or glassmorphism. The aesthetic is matte paper.
- Don't introduce icon libraries. Use text glyphs (`✈`) or hand-drawn SVG.
- Don't add a desktop-specific layout. Desktop is a centered phone frame.
- Don't add an "About", "Settings", or "Help" page. The app is its own help.
