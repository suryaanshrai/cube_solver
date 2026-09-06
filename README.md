# Cube Solver

Show each face of a scrambled Rubik's cube to your camera, then follow the solution as it
plays out on a 3D model of *your* cube — one turn at a time, with the face named by its
colour and the rotation drawn on the model.

**Live:** https://suryaanshrai.pythonanywhere.com/ · **Demo:** https://youtu.be/bTjkN2u0OyQ

---

## What changed in v3

The first two versions asked you to click fifty-four coloured squares into a grid and
then handed back `R U' F2` next to a diagram of arrows. Both ends of that assume you
already speak cube notation — which is the one thing someone looking for a solver has
disproved. The solve itself was never the problem, so it is unchanged: Kociemba's
two-phase algorithm, on the server, in about twenty moves.

| | v2 | v3 |
|---|---|---|
| Input | 54 squares clicked by hand | Camera, six faces, auto-captured |
| Wrong input | "Input error. Try again." | Named: which sticker, and why it can't exist |
| Output | One letter and a notation chart | 3D model of your cube, animated turn by turn |
| Control | Two arrow images | Arrow keys, space, and a full shortcut set |
| Front end | Jinja + Bootstrap | Vite + React + React Three Fiber |

## How the camera part works

Fixed HSV thresholds are the usual way a cube scanner is built and the usual reason one
fails: red under tungsten and orange under daylight land in the same bucket, and nothing
in the frame tells you which you're looking at. This classifies relatively instead.

1. Each sticker is the **median** of an 11×11 patch — cube plastic is glossy, and a mean
   lets one specular highlight turn a yellow sticker white.
2. Each face is **normalised by its own mean lightness**, because six handheld captures
   are six different exposures.
3. The **six centre stickers are ground truth** — the flow tells you which face to
   present, so their measured colours calibrate the other 48 to this cube, this dye
   batch, and this room.
4. Assignment is **capacity-constrained** to exactly nine of each colour, so a sticker
   that "wants" a colour already used nine times goes to its next best. That repairs most
   single misreads without asking you anything.
5. Whatever is left over is **flagged for review** by the margin between its best and
   second-best fit, so you check a handful of stickers rather than all fifty-four.

`web/src/scan/classify.test.js` feeds this synthetic captures with per-face exposure
differences, a warm-to-cool colour cast and sensor noise, and requires the exact cube back.

## How the 3D part works

The eighteen move permutations are **generated from geometry**, not typed out. A sticker
knows the cubie it sits on and the direction it faces; a turn rotates both, in exact
integer arithmetic (`web/src/cube/geometry.js`). The renderer reads the same table, so the
model and the solver cannot drift apart.

A turn never reparents a mesh. Cubies always sit at their home grid positions and take
their colours from a 54-character string, so an animation is: hold the pre-move string,
rotate a group containing that layer, then swap in the post-move string. The render is a
pure function of a string and one angle.

## Running it

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python app.py                 # API on :5000

cd web && npm install && npm run dev    # UI on :5173, proxying /api to :5000
```

For production, `npm run build` in `web/` and Flask serves `web/dist` from the same origin.
`Procfile` is unchanged — `gunicorn app:app`.

> Cameras need a secure context. That means HTTPS in production, or `localhost` in
> development. Anyone without a camera gets the manual grid, which is the same component
> used for corrections.

## Testing

```bash
.venv/bin/python -m pytest tests/    # 30 API tests

cd web
npm test                             # 24 unit tests — move engine, validation, classifier
npm run test:flow                    # scramble → solve → step every move → solved
npm run test:scan                    # the camera path, driven by real video frames
npm run test:a11y                    # focus rings, reduced motion, semantics
npm run test:shots                   # 375 → 2560: console errors, overflow, screenshots
```

The end-to-end scripts need the app running on `:5000` (`BASE=` overrides the URL) and a
browser: `npx playwright install chromium` once, or set `CHROMIUM_PATH` if one is already
provided. Output lands in `web/test-results/`.

Two of those are worth calling out.

`web/src/cube/fixtures.json` holds 58 cube states together with the solutions the real
Kociemba solver returned for them. Replaying those solutions through the JavaScript move
engine has to land on a solved cube — it is the assertion the animated player depends on,
and both the Python and JavaScript suites check against the same file.

`tests/e2e/scan.mjs` drives the scanner with Chromium's fake capture device fed a
generated Y4M clip of a cube face (`tests/e2e/make-y4m.mjs`). Mocking `getUserMedia` would
only prove the mock works; this pushes real frames through the real sampler.

## Layout

```
app.py                    Flask — POST /api/solve, GET /api/health, serves web/dist
DESIGN.md                 the design system, mirrored from tokens.css
docs/art-direction.md     why those values
docs/PRD.md               the brief and its acceptance criteria
tests/test_api.py
web/src/
  cube/                   geometry, move engine, validation — no UI, no framework
  scan/                   camera, sampler, classifier, the six-face flow, the review net
  three/                  cube model, lighting rig, turn arrow, camera director
  solve/                  the step player and its keybindings
  landing/ routes/ ui/    the pages
  styles/tokens.css       every colour, size and duration in the project
```

`web/src/cube/` is plain JavaScript with no imports from anything else in the project,
which is why it can be tested directly against the Python solver's output.

## Keyboard

`→` / `Space` next · `←` back · `↑` `↓` first / last · `R` replay the turn ·
`P` play all · `O` lock the camera · `Esc` back to the grid · `?` the full list

## Colour scheme

Kociemba works from a fixed orientation, so the scan assumes the standard Western
scheme — yellow opposite white, red opposite orange, green opposite blue — held with
**yellow up and red facing you**. The flow states this at every step and checks the centre
before it captures. Non-standard cubes are out of scope.

## Credits

Solving by [`kociemba`](https://github.com/muodov/kociemba). Built by
[Suryaansh Rai](https://github.com/suryaanshrai).
