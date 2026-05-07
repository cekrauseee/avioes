# Images

The hand-drawn paper-journal illustrations are part of the product — they replace the empty UI states, the splash, the error screens, and the welcome flow. This file maps every image we ship, defines the visual contract they all follow, and explains how to request a new one.

There is no design tool in the loop: every illustration is generated from a written prompt and saved as a PNG into `public/`. Treat the prompt as part of the source artifact, not as a one-off command.

## Catalog

Every user-facing illustration ships as a **light/dark PNG pair** rendered with `next/image` (`unoptimized`) inside `theme-light-only` / `theme-dark-only` wrappers. Names are kebab-case and end in `-light.png` / `-dark.png`. App icons and favicons are the only files without a transparent background.

| File (`public/`)                      | Size (px)   | Where it shows up                                                        |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `onboarding-hero-{light,dark}.png`    | 1254 × 1254 | `auth-screen.tsx` welcome step                                           |
| `invite-hero-{light,dark}.png`        | 1254 × 1254 | `auth-screen.tsx` (invite flow welcome), `invite-screen.tsx` invite page |
| `invite-accepted-{light,dark}.png`    | 1254 × 1254 | `invite-screen.tsx` post-accept screen                                   |
| `empty-counter-{light,dark}.png`      | 1254 × 1254 | `counter.tsx` (only when both totals are 0)                              |
| `empty-diary-{light,dark}.png`        | 1254 × 1254 | `diary-view.tsx` empty state                                             |
| `empty-scoreboard-{light,dark}.png`   | 1254 × 1254 | `scoreboard-view.tsx` empty state                                        |
| `airplane-not-found-{light,dark}.png` | 1254 × 1254 | `app/not-found.tsx`, `invite-screen.tsx` not-found                       |
| `airplane-error-{light,dark}.png`     | 1254 × 1254 | `app/error.tsx`, `auth-screen.tsx` OAuth-error step                      |
| `airplane-offline-{light,dark}.png`   | 1254 × 1254 | `offline-gate.tsx`                                                       |
| `splash-{light,dark}.png`             | 941 × 1672  | `app/loading.tsx` (root cold-load)                                       |
| `flying-airplane-{light,dark}.png`    | 512 × 512   | `plane-arc.tsx` tap fly-by sprite (also preloaded in `counter.tsx`)      |
| `favicon-{light,dark}.png`            | 512 × 512   | `app/layout.tsx` `metadata.icons` (browser tab)                          |
| `icons/icon-1024.png`                 | 1024 × 1024 | `app/manifest.ts` PWA icon, `metadata.icons.apple`                       |
| `icons/icon-maskable-1024.png`        | 1024 × 1024 | `app/manifest.ts` Android maskable icon                                  |

Every PNG referenced from a user-facing screen must also be listed in `OFFLINE_ASSETS` inside `src/app/sw.js/route.ts` so the empty states and error screens survive offline. Service-worker cache invalidation is automatic — the cache name is tied to Next's `BUILD_ID`.

## Visual contract

Every illustration must obey the same rules so the set reads as one hand:

- **Style**: hand-drawn paper-journal sketch, matte paper, hand-pressed, slightly imperfect linework that wobbles like a margin doodle.
- **Composition**: subject centered, generous negative space, no horizon line, no ground line, no people, no text or labels of any kind unless explicitly part of the asset (the icons are wordless too).
- **Background**: fully transparent PNG with alpha channel — no background fill, no paper texture, no canvas, no gradients. The cream paper colour comes from the page bg, not the PNG. **Exception**: `icons/*` ship a solid warm-cream (`#F6F1E7`) background because launchers crop to a mask and demand an opaque surface.
- **No gradients, drop shadows, glassmorphism, rim lighting, or inner glow.** Flat colours only.
- **Clean cutout edges**, no white halo around the subject.

### Palette tokens

Light-mode prompts use these hex values; dark-mode prompts swap them 1-for-1 with the right column. Keep these exact — they match the CSS tokens in `src/app/globals.css`.

| Role                  | Light     | Dark      |
| --------------------- | --------- | --------- |
| Deep ink-green (line) | `#1F2A24` | `#EDE6D6` |
| Muted faint-sage      | `#8A9890` | `#6E6A60` |
| Soft sage green       | `#7C9A82` | `#9CB6A1` |
| Warm clay terracotta  | `#C97B5C` | `#E59A7E` |
| Pale sky blue         | `#A8C3D4` | `#6E8FA3` |
| Warm cream (icon bg)  | `#F6F1E7` | n/a       |

The dark-mode prompt is always literally "the same image as the previous prompt, but recoloured for dark mode" with the swap list inlined. Don't redesign the composition for dark.

## Requesting a new image

The model **does not** generate images directly. When a feature needs new art, hand the prompt to Codex (or the human operator) along with the file name and target location, then wire the rendered PNG into the relevant screen.

The unit of delivery is:

1. **File name** in `public/` (kebab-case, ends in `-light.png` and `-dark.png` for theme pairs; just `.png` for icons/favicons that already encode their context).
2. **Light-mode prompt** that follows the visual contract above.
3. **Dark-mode prompt** as a one-line palette swap that points back at the light prompt.
4. **Wiring**: which component renders it, and an entry added to `OFFLINE_ASSETS` if it ships in a user-facing screen.

Once Codex returns the PNG, drop it into `public/<name>.png`, render it via `next/image` (`unoptimized` plus `theme-light-only` / `theme-dark-only`), and run `npm run build` to confirm the manifest stays clean.

### Prompt template

Copy this template, fill in the **bracketed fields**, and paste into the image generator. The wording deliberately echoes the full set so any new asset reads as part of the same notebook.

> **Light mode**
>
> Square 1:1 illustration, **\[width\]** by **\[height\]** pixels. Hand-drawn paper-journal sketch of **\[subject in one sentence — what the airplane(s) / object is doing, where it sits in the frame\]**. **\[Per-element fills using the palette tokens, e.g. "the airplane is filled in soft sage green (#7C9A82) and outlined in deep ink-green (#1F2A24)"\]**. **\[Optional supporting marks — dashed flight trail in muted faint-sage (#8A9890), faint cloud puffs in low-opacity pale sky blue (#A8C3D4), envelope in warm clay terracotta (#C97B5C), etc.\]**. **\[One-sentence mood line — "the mood is X, not Y" — keep it calm/quiet/journal-like, never alarming\]**. No horizon line, no ground line, no people, no text or labels of any kind. Style is matte paper, hand-pressed, with slightly imperfect linework like a doodle in the margin of a journal. Flat colours only — no gradients, no drop shadows, no glassmorphism, no rim lighting. Subject centered. Fully transparent background (PNG with alpha channel) — no background fill, no paper texture, no canvas, no gradients. Only **\[the listed elements\]** are visible. Clean cutout edges, no white halo around the subject.
>
> **Dark mode**
>
> Now the exact same image as the previous prompt, but recoloured for dark mode. Swap the palette as follows: deep ink-green (#1F2A24) becomes warm cream (#EDE6D6); muted faint-sage (#8A9890) becomes warm-grey (#6E6A60); soft sage green (#7C9A82) becomes muted dark-mode sage (#9CB6A1); warm clay terracotta (#C97B5C) becomes warm dark-mode clay (#E59A7E); pale sky blue (#A8C3D4) becomes steel sky blue (#6E8FA3). Everything else — composition, layout, subject, line style, dimensions, and the fully transparent background (PNG with alpha channel) — stays exactly the same.

Notes on filling the template:

- **Dimensions**: pick from the catalog (1254 × 1254 for hero/empty/error illustrations, 941 × 1672 for splash, 512 × 512 for sprites/favicons, 1024 × 1024 for icons). New illustrations should reuse one of these sizes unless there is a real reason not to.
- **Subject sentence**: lead with the airplane's pose and trajectory. Empty/error states should feel quiet and recoverable, never panicked. Reunion/celebration states (invite accepted) should feel warm, not loud.
- **Supporting marks**: prefer dashed flight trails, faint cloud puffs, fold creases, dust curls. Don't introduce new motifs (icons, ground lines, people) without a strong reason — the set's coherence is the product.
- **Mood line**: ends every prompt with one sentence about feeling. This is what makes the result feel like a journal and not a marketing illustration.
- **Asset variants outside the square**:
  - For **icons** (`icons/*`), the canvas is opaque warm cream (`#F6F1E7`), the linework is a touch thicker so it survives downscaling, and the meaningful content for `icon-maskable-1024.png` must sit inside the central 80 % safe circle.
  - For **favicons**, simplify to a single bold airplane silhouette with no trail, no clouds, and a heavier stroke — fine pencil texture disappears at 16 px.
  - For **the flying-airplane sprite**, the airplane points right, fills ~80 % of the canvas width, and has no trail.

When in doubt, pick an existing illustration that feels closest to the new one and describe the new asset by reference to it. Coherence beats novelty here.
