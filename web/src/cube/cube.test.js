/**
 * The correctness backbone.
 *
 * `fixtures.json` holds 58 cube states together with the solutions the real Kociemba
 * solver returned for them — 18 single-move states and 40 random 22-move scrambles.
 * Replaying those solutions through this engine has to land on a solved cube, which is
 * the same assertion the running app depends on when it animates a turn.
 */

import { describe, it, expect } from "vitest";
import { SOLVED, MOVES, applyMove, applySequence, invertMove, statesAlong } from "./moves.js";
import { validateCube, isSolved } from "./validate.js";
import { assembleFacelets, splitFacelets } from "./facelets.js";
import fixtures from "./fixtures.json";

describe("move engine", () => {
  it("returns to the start after four quarter turns of any face", () => {
    for (const face of ["U", "R", "F", "D", "L", "B"]) {
      let state = SOLVED;
      for (let i = 0; i < 4; i += 1) state = applyMove(state, face);
      expect(state).toBe(SOLVED);
    }
  });

  it("undoes every move with its inverse", () => {
    for (const move of MOVES) {
      expect(applySequence(SOLVED, [move, invertMove(move)])).toBe(SOLVED);
    }
  });

  it("treats a half turn as two quarter turns", () => {
    for (const face of ["U", "R", "F", "D", "L", "B"]) {
      expect(applyMove(SOLVED, `${face}2`)).toBe(applySequence(SOLVED, [face, face]));
    }
  });

  it("restores the cube after six repetitions of R U R' U'", () => {
    let state = SOLVED;
    for (let i = 0; i < 6; i += 1) state = applySequence(state, ["R", "U", "R'", "U'"]);
    expect(state).toBe(SOLVED);
  });

  it("agrees with Kociemba on the inverse of a single move", () => {
    for (const fixture of fixtures.filter((f) => f.kind === "single")) {
      expect(fixture.solution).toEqual([invertMove(fixture.move)]);
    }
  });

  it("reaches a solved cube by replaying every Kociemba solution", () => {
    for (const fixture of fixtures) {
      expect(applySequence(fixture.facelets, fixture.solution)).toBe(SOLVED);
    }
  });

  it("exposes one state per step, ending solved", () => {
    const fixture = fixtures.at(-1);
    const states = statesAlong(fixture.facelets, fixture.solution);
    expect(states).toHaveLength(fixture.solution.length + 1);
    expect(states[0]).toBe(fixture.facelets);
    expect(isSolved(states.at(-1))).toBe(true);
  });
});

describe("validation", () => {
  it("accepts every reachable state", () => {
    for (const fixture of fixtures) {
      expect(validateCube(fixture.facelets)).toEqual({ ok: true });
    }
  });

  const impossible = {
    "a miscounted colour": SOLVED.slice(0, 53) + "U",
    "a corner twisted in place": (() => {
      const cells = [...SOLVED];
      [cells[8], cells[20], cells[9]] = ["F", "R", "U"];
      return cells.join("");
    })(),
    "an edge flipped in place": (() => {
      const cells = [...SOLVED];
      [cells[7], cells[19]] = [cells[19], cells[7]];
      return cells.join("");
    })(),
    "a pair swapped against parity": (() => {
      const cells = [...SOLVED];
      [cells[7], cells[5]] = [cells[5], cells[7]];
      [cells[19], cells[10]] = [cells[10], cells[19]];
      return cells.join("");
    })(),
    "a centre that changed colour": SOLVED.slice(0, 4) + "R" + SOLVED.slice(5),
  };

  for (const [name, facelets] of Object.entries(impossible)) {
    it(`rejects ${name} with an explanation`, () => {
      const result = validateCube(facelets);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/\w+/);
    });
  }
});

describe("facelet assembly", () => {
  it("round-trips through per-face arrays", () => {
    const fixture = fixtures.at(0);
    expect(assembleFacelets(splitFacelets(fixture.facelets))).toBe(fixture.facelets);
  });
});
