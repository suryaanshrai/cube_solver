# Art Direction — Cube Solver

> This is the lock. It was written before any markup existed. Every visual and motion
> value in the project resolves to a token defined here. When you are tempted to deviate,
> either change the lock deliberately and propagate, or don't deviate.

## The one-line brief

It should feel like operating a precise instrument that reads your cube and hands back
the answer — not like using an app that has a cube feature.

## Reference register

- **Flight deck** — numeric readouts in the corners, hairline rules, nothing decorative.
- **Metrology lab** — one object, lit properly, measured against a fixed grid.
- **Technical manual, 1974** — monospaced captions, plate numbers, exact language.

## The anchor

**One cube.** Studio-lit, floating in near-black, rotating slowly, responsive to the pointer.
It is the same object on the landing page and in the solver — the landing page's scroll
chapters change its *state*, they never introduce a second impressive thing.

## Anti-brief

Never SaaS-friendly. No feature-card grid. No icon circles. No 8px rounded rectangles.
No purple→blue 45° gradient. No emoji. No "Everything you need to". No stock photography
of hands. No second animated thing competing with the cube.

## Palette — five values

| Role | Value | Use |
|---|---|---|
| Ground | `#08090B` | 90% of every screen |
| Ground +1 | `#0E1014` | raised surfaces, rails, panels |
| Ground +2 | `#171A20` | insets, wells, the scan viewport frame |
| Ink | `#DCE0E6` | at 100 / 62 / 38% |
| Hairline | ink @ 10% | every border on the site |
| **Accent** | `#2BE8CE` | signal teal — see below |

### Why the accent is teal

A Rubik's cube puts six saturated colours on screen already: white, yellow, red, orange,
green, blue. Any accent drawn from that set collides semantically — a green UI accent
sitting next to the green face reads as a bug, not as design. The accent is therefore
deliberately **outside** the cube's palette.

It appears in exactly three places, and nowhere else:

1. The active move token in the solve rail.
2. The `CENTRE LOCKED` confirmation during scanning.
3. Focus rings.

Under 5% of any screen. If it shows up a fourth time, that is the bug.

### The cube colours are data, not palette

`--cube-U` … `--cube-B` are defined separately from the palette because they are *readings*,
not design decisions. They are the only saturated colour on the site and they only ever
appear on a cube, a sticker swatch, or a face name.

## Type

| Role | Family | Size | Weight | Tracking | Leading |
|---|---|---|---|---|---|
| Display | Geist Variable | `clamp(3.25rem, 9vw, 10.5rem)` | 300 | `-0.035em` | `0.92` |
| H1 | Geist Variable | `clamp(2.25rem, 5vw, 4.5rem)` | 300 | `-0.03em` | `1.0` |
| H2 | Geist Variable | `clamp(1.5rem, 2.75vw, 2.5rem)` | 400 | `-0.02em` | `1.1` |
| Lead | Geist Variable | `clamp(1.0625rem, 1.4vw, 1.3125rem)` | 400 | `-0.005em` | `1.55` |
| Body | Geist Variable | `1rem` | 400 | `0` | `1.65` |
| Chrome / HUD | Geist Mono Variable | `0.6875rem` | 500 | `0.16em` | `1.2` |

**Display-to-body ratio at 1440px:** 168px / 16px = **10.5 : 1**. (Skill target ≥ 6:1.)

Two families, both self-hosted through `@fontsource-variable` — no render-blocking
third-party stylesheet, no layout shift on swap.

Body measure never exceeds 62ch; lead never exceeds 45ch.

## Motion signature

- **Entrance curve:** `cubic-bezier(0.16, 1, 0.3, 1)` — fast out, long settle.
- **Entrance duration:** 900ms. **Stagger:** 75ms siblings, 50ms text lines.
- **UI feedback:** `cubic-bezier(0.4, 0, 0.2, 1)` at 220ms — sharp and mechanical, because
  the register is an instrument, not a luxury good.
- **Cube turn:** 460ms on the entrance curve. Slow enough to follow with your hands.
- **The one recurring gesture:** everything enters by unmasking upward from a `clip-path`
  inset, paired with a 24px translate. Never opacity alone.
- `prefers-reduced-motion` collapses to end states instantly — never merely shortened.

## Rulers

Three x-positions. Every text block on the site starts at one of them.

- **A** — `--margin`, `clamp(1.5rem, 6vw, 7rem)` — the page edge
- **B** — `38%` — the off-centre column
- **C** — `62%` — the counterweight

## Surface, light, texture

- One key light, upper-left. Every shadow on the site falls lower-right. The 3D scene's
  key light matches.
- Backgrounds are **radial falloff from that key**, never a linear gradient at an angle.
- 3.5% grain overlay, `mix-blend-mode: overlay`, fixed to the viewport.
- Borders are hairlines at ink@10%. Never a solid grey 1px.
- Radii are `0` or `20px`. Never the 8–12px middle, which is Bootstrap's fingerprint.
- Vignette at the frame edge, under 25%.

## Density budget

- **≤ 3 text objects** per viewport in hero and narrative sections.
- **≤ 12%** screen area covered by ink in those sections.
- **≤ 2** simultaneous animations in view.
- **6 sections** on the landing page, no more.
- Nav: **2 items**. There is one thing to do on this site.
