# Design system — Cube Solver

A mirror of `web/src/styles/tokens.css`, kept at the repo root so a future session or a
different agent picks up the system rather than re-deriving it. The reasoning behind
each choice is in [`docs/art-direction.md`](docs/art-direction.md).

**Register:** precision instrument. Flight deck, metrology lab, 1974 technical manual.
**Anchor:** one cube, studio-lit, in a lot of empty space. There is no second one.

## Palette — five values, plus six readings

| Token | Value | Use |
|---|---|---|
| `--ground` | `#08090B` | 90% of every screen |
| `--ground-1` | `#0E1014` | raised surfaces, rails, panels |
| `--ground-2` | `#171A20` | insets, wells, the scan viewport |
| `--ink` | `#DCE0E6` | at 100 / 62 / 38% |
| `--hairline` | ink @ 10% | every border on the site |
| `--accent` | `#2BE8CE` | signal teal — three places only |

The accent is deliberately outside the cube's own six colours. A green UI accent beside
the green face reads as a bug. It appears on the active move token, the `CENTRE LOCKED`
confirmation, and focus rings. Nowhere else, and under 5% of any screen.

`--cube-U … --cube-B` are separate from the palette because they are *readings*, not
design decisions. They appear only on a cube, a swatch, or beside a face name.

## Type

Two families, both self-hosted via `@fontsource-variable`.

- **Display / body** — Geist Variable. Display `clamp(3.25rem, 9vw, 10.5rem)`, weight 300,
  tracking `-0.035em`, leading `0.92`.
- **Chrome / HUD** — Geist Mono Variable at 11px, uppercase, tracking `0.16em`, opacity 0.55.

Display-to-body at 1440px is **10.5 : 1**. Body never exceeds 62ch, lead never 45ch.

## Rulers

Every text block on the site starts at one of three x-positions, and only three.

- **A** — `--margin`, `clamp(1.5rem, 6vw, 7rem)`
- **B** — `38%`
- **C** — `62%`

Below 900px they collapse to A.

## Motion

- Entrance `cubic-bezier(0.16, 1, 0.3, 1)` / 900ms / 75ms stagger.
- UI feedback `cubic-bezier(0.4, 0, 0.2, 1)` / 220ms — sharp, because this is an instrument.
- Cube turn 460ms, slow enough to follow with your hands.
- The one recurring gesture: unmask upward from a `clip-path` inset paired with a 24px
  translate. **Never opacity alone.**
- `prefers-reduced-motion` collapses to end states, and the hidden start state is gated
  behind a `.js` class so a scriptless page renders finished.

## Surface

One key light, upper-left — in CSS and in the 3D rig alike, so every shadow on the site
falls the same way. Backgrounds are radial falloff from that key, never a linear gradient
at an angle. 3.5% grain. Hairlines at ink@10%. Radii are `0` or `20px`, never the 8–12px
middle.

## Budgets

≤ 3 text objects per viewport in hero and narrative sections · ≤ 12% ink coverage there ·
≤ 2 simultaneous animations · 6 landing sections · 2 nav items.

## Rule

No hex value appears anywhere outside `tokens.css`. `grep -rn '#[0-9a-fA-F]\{6\}' web/src`
should only ever match that file and the two places 3D materials read tokens back out.
