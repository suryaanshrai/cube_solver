# PRD — Cube Solver v3

*Format follows the problem-framing + user-story pattern from
[deanpeters/Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills).
Written before the build so "done" is defined in advance.*

---

## 1. Problem frame

**Who.** Someone holding a scrambled 3×3 cube who cannot solve it and does not want to
learn CFOP to get it back to solved.

**What they do today.** They find a solver, then spend three to five minutes clicking
fifty-four coloured squares into a grid — and if they misclick one, they get an error
with no indication of which square was wrong. Then they receive the solution as cube
notation (`R U' F2`), which is a language they do not speak, next to a diagram of arrows
they have to decode per move while holding the cube in the air.

**The gap.** Both ends of the flow assume the user is already a cuber. Input assumes
they'll transcribe accurately; output assumes they read notation. The middle — the
Kociemba solve — was never the problem.

**Why now.** `getUserMedia` and WebGL are universally available. The two hard parts —
reading the cube and showing the turn — are solvable in the browser on a phone.

**How we'll know it worked.** A first-time user with no cube vocabulary goes from
scrambled to solved without ever seeing the word "algorithm", and without typing anything.

## 2. Non-goals

- Not a timer, trainer, or algorithm reference.
- Not 2×2, 4×4, or any non-standard colour scheme (Kociemba's fixed mapping is assumed:
  yellow up, red front).
- Not accounts, history, or sharing.
- Not the fewest possible moves — Kociemba's near-optimal solution is the right trade.

## 3. User stories with acceptance criteria

### US-1 — Scan the cube with the camera

> As someone holding a scrambled cube, I want to show each face to my camera, so that I
> don't have to transcribe fifty-four squares by hand.

```gherkin
Scenario: Capturing a face that is correctly aligned
  Given I have granted camera permission
  And the app is asking for face 2 of 6
  When I hold the cube with the green centre facing the camera and yellow on top
  And I hold it steady for roughly one second
  Then the reticle reads "CENTRE LOCKED"
  And a progress ring completes and the face is captured automatically
  And the app advances to face 3 and shows me how to roll the cube to get there

Scenario: Holding the wrong face up
  Given the app is asking for face 2 of 6, expecting a green centre
  When I present a face whose centre reads red
  Then the app tells me it expected green and is seeing red
  And it does not capture

Scenario: The room is too dark to classify reliably
  When mean luminance inside the reticle falls below the usable threshold
  Then the app names the problem as low light rather than capturing a bad reading
  And auto-capture is suppressed until it clears

Scenario: No camera, or permission denied
  When camera access is unavailable for any reason
  Then I am taken to the manual grid with an explanation
  And I can complete the whole flow without a camera
```

### US-2 — Trust and correct what was read

> As a user, I want to see and fix what the camera read, so that one misread sticker
> doesn't cost me the whole scan.

```gherkin
Scenario: Reviewing the scan
  Given all six faces are captured
  Then I see all six as an unfolded net
  And any sticker the classifier was unsure about is visibly flagged
  And a per-colour counter shows me which colours are miscounted

Scenario: Correcting a sticker
  When I select a flagged sticker and choose a colour
  Then the net updates and the counters update
  And I can only proceed once every colour counts exactly nine

Scenario: An impossible cube
  Given the counts are correct but the cube cannot physically exist
  When I try to solve
  Then I am told what is wrong in plain language before any request is made
```

### US-3 — Follow the solution on a 3D model of my cube

> As a user, I want to see the turn happen on a model of *my* cube, so that I know
> exactly which layer to move and in which direction.

```gherkin
Scenario: Stepping through the solution
  Given my cube has been solved
  Then I see a 3D cube in my cube's actual scrambled configuration
  When I press the right arrow key or the next button
  Then the correct layer rotates on the model in the correct direction
  And the instruction names the face by colour, not only by notation
  And the counter shows which step of how many I am on

Scenario: A turn on a face I cannot see
  When the next move is on the back or bottom layer
  Then the camera eases around so the turning face is visible
  And I can lock the orientation if I prefer a fixed view

Scenario: Going backwards
  When I press the left arrow key
  Then the previous turn is undone on the model
  And the state shown always matches the number of moves applied

Scenario: Reaching the end
  When I advance past the final move
  Then the model shows a solved cube
```

### US-4 — Drive it from the keyboard

> As a user with the cube in both hands, I want keyboard control, so that I can advance
> without aiming a mouse.

```gherkin
Scenario: Keyboard control
  Given I am on the solve screen
  Then "→" and "Space" advance one move
  And "←" goes back one move
  And "↑" and "↓" jump to the first and last move
  And "R" replays the current turn, "P" toggles autoplay, "O" toggles auto-orbit
  And "?" shows the full shortcut list
  And every interactive control shows a visible focus ring when tabbed to
```

### US-5 — Arrive at something worth using

> As a first-time visitor, I want the site to look like it was built by people who care,
> so that I trust it with the thing I'm stuck on.

```gherkin
Scenario: The landing page
  Then there is exactly one signature element and it is the cube
  And every text block aligns to one of three fixed x-positions
  And the frozen page with JavaScript disabled is still worth looking at
  And nothing is stranded invisible under prefers-reduced-motion
  And the page is usable and well-composed from 375px to 2560px
```

## 4. Constraints

- `getUserMedia` requires a secure context: HTTPS in production, `localhost` in dev.
- Kociemba assumes the fixed colour scheme (yellow up / red front); non-standard cubes
  are out of scope and the scan flow states the assumption up front.
- Solving stays server-side in Python — it is the proven path and it is not the bottleneck.

## 5. Acceptance gate

Ship when: every scenario above passes, `pytest` is green, the move engine round-trips
random scrambles to solved, and the design critique rubric scores ≥ 30/45.
