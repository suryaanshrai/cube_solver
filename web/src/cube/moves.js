/**
 * The move engine.
 *
 * Permutations are generated from `geometry.js` at module load — a clockwise turn of
 * face X rotates every sticker whose cubie lies in that layer, carrying its facing
 * direction with it. The 18 tables are therefore derived, not transcribed, which is
 * why they cannot drift out of step with the renderer.
 *
 * Applying the moves a solver returns to the state that was fed to it must produce a
 * solved cube. That round trip is the project's central correctness assertion and is
 * exercised in `moves.test.js` against real Kociemba output.
 */

import { FACES, FACE_NORMAL, STICKERS, rotateQuarter, stickerIndexAt, dot } from "./geometry.js";

export const SOLVED = FACES.map((f) => f.repeat(9)).join("");

/** Every legal move token, in the notation Kociemba emits. */
export const MOVES = FACES.flatMap((f) => [f, `${f}'`, `${f}2`]);

/**
 * `CLOCKWISE[face][i] = j` — the sticker at index i ends up at index j after a
 * clockwise quarter turn of `face`, seen from outside that face.
 */
const CLOCKWISE = Object.fromEntries(
  FACES.map((face) => {
    const n = FACE_NORMAL[face];
    const perm = STICKERS.map((s) => s.index); // identity for stickers outside the layer
    for (const s of STICKERS) {
      if (dot(s.cubie, n) !== 1) continue; // not in this layer
      const cubie = rotateQuarter(s.cubie, n, -1);
      const normal = rotateQuarter(s.normal, n, -1);
      perm[s.index] = stickerIndexAt(cubie, normal);
    }
    return [face, perm];
  }),
);

const compose = (a, b) => a.map((_, i) => b[a[i]]);

/** `PERMUTATIONS[move][i] = j` for all 18 moves. */
export const PERMUTATIONS = (() => {
  const table = {};
  for (const face of FACES) {
    const cw = CLOCKWISE[face];
    table[face] = cw;
    table[`${face}2`] = compose(cw, cw);
    table[`${face}'`] = compose(compose(cw, cw), cw);
  }
  return table;
})();

/** Apply one move to a 54-character facelet string. Pure. */
export function applyMove(facelets, move) {
  const perm = PERMUTATIONS[move];
  if (!perm) throw new Error(`Unknown move: ${move}`);
  const next = new Array(54);
  for (let i = 0; i < 54; i += 1) next[perm[i]] = facelets[i];
  return next.join("");
}

/** Apply a sequence, given as an array of tokens or a space-separated string. */
export function applySequence(facelets, moves) {
  const list = Array.isArray(moves) ? moves : moves.split(/\s+/).filter(Boolean);
  return list.reduce(applyMove, facelets);
}

/** The move that undoes `move`. */
export function invertMove(move) {
  if (move.endsWith("2")) return move;
  if (move.endsWith("'")) return move.slice(0, -1);
  return `${move}'`;
}

/** Every prefix of a solution, so any step can be shown without replaying from zero. */
export function statesAlong(facelets, moves) {
  const states = [facelets];
  let current = facelets;
  for (const move of moves) {
    current = applyMove(current, move);
    states.push(current);
  }
  return states;
}

/* ── describing a move to someone holding a cube ──────────────────────────── */

/** How far, in signed quarter turns clockwise-from-outside. */
export function quarterTurns(move) {
  if (move.endsWith("2")) return 2;
  if (move.endsWith("'")) return -1;
  return 1;
}

const DIRECTION_WORD = {
  1: "clockwise",
  "-1": "counter-clockwise",
  2: "a half turn",
};

/**
 * Plain language for a move, naming the face by the colour the user is looking at.
 * Notation is shown alongside, never instead — the old site's failure was assuming
 * the reader already speaks it.
 */
export function describeMove(move, faceColourName) {
  const turns = quarterTurns(move);
  const colour = faceColourName(move[0]);
  if (turns === 2) {
    return `Turn the ${colour} face a half turn — 180°, either direction.`;
  }
  return `Turn the ${colour} face a quarter turn ${DIRECTION_WORD[turns]}.`;
}
