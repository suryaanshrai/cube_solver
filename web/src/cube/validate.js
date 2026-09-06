/**
 * Is this cube physically possible?
 *
 * The point of doing this on the client is the error message. Kociemba will reject an
 * impossible cube, but it rejects it with a terse string after a network round trip.
 * A person who has just scanned 54 stickers needs to know *which* of the four ways a
 * cube can be impossible they've hit, in words, before anything is sent.
 *
 * The four invariants, in the order they're worth reporting:
 *   1. Nine of each colour, and each centre naming its own face.
 *   2. Every corner and edge is a real piece, used exactly once.
 *   3. Corner twists sum to a multiple of three; edge flips to a multiple of two.
 *   4. Corner and edge permutations have the same parity.
 */

import { STICKERS, key, cross, dot } from "./geometry.js";
import { FACES, FACE_COLOUR } from "./facelets.js";

const stickersOn = (cubie) =>
  STICKERS.filter((s) => key(s.cubie) === key(cubie));

const det = (a, b, c) => dot(a, cross(b, c));

/**
 * Order a corner's three stickers clockwise as seen from outside the corner, starting
 * with the one facing up or down. Clockwise is the case where the three normals form a
 * left-handed triple — checked rather than assumed.
 */
function orderCorner(cubie) {
  const stickers = stickersOn(cubie);
  const primary = stickers.find((s) => s.normal[1] !== 0);
  const rest = stickers.filter((s) => s !== primary);
  const [a, b] = rest;
  return det(primary.normal, a.normal, b.normal) === -1
    ? [primary, a, b]
    : [primary, b, a];
}

/** Edge stickers, primary slot first: the U/D sticker, or the F/B one for the middle layer. */
function orderEdge(cubie) {
  const stickers = stickersOn(cubie);
  const primary =
    stickers.find((s) => s.normal[1] !== 0) ??
    stickers.find((s) => s.normal[2] !== 0);
  return [primary, stickers.find((s) => s !== primary)];
}

const CORNER_SLOTS = [];
const EDGE_SLOTS = [];
for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) {
      const rank = Math.abs(x) + Math.abs(y) + Math.abs(z);
      if (rank === 3) CORNER_SLOTS.push(orderCorner([x, y, z]).map((s) => s.index));
      if (rank === 2) EDGE_SLOTS.push(orderEdge([x, y, z]).map((s) => s.index));
    }
  }
}

/** The eight corner pieces and twelve edge pieces, as sorted colour signatures. */
const signature = (letters) => [...letters].sort().join("");
const CORNER_PIECES = CORNER_SLOTS.map((slot) =>
  signature(slot.map((i) => FACES[Math.floor(i / 9)])),
);
const EDGE_PIECES = EDGE_SLOTS.map((slot) =>
  signature(slot.map((i) => FACES[Math.floor(i / 9)])),
);

/** A piece's own reference sticker: its U/D facelet, or its F/B one. */
const primaryOf = (letters) =>
  letters.find((l) => l === "U" || l === "D") ??
  letters.find((l) => l === "F" || l === "B");

const permutationParity = (perm) => {
  const seen = new Array(perm.length).fill(false);
  let swaps = 0;
  for (let i = 0; i < perm.length; i += 1) {
    if (seen[i]) continue;
    let j = i;
    let length = 0;
    while (!seen[j]) {
      seen[j] = true;
      j = perm[j];
      length += 1;
    }
    swaps += length - 1;
  }
  return swaps % 2;
};

const colourWord = (letter) => FACE_COLOUR[letter] ?? letter;

/**
 * @returns {{ok: boolean, error?: string, badStickers?: number[]}}
 *   `badStickers` names facelet indices worth flagging in the review grid.
 */
export function validateCube(facelets) {
  if (typeof facelets !== "string" || facelets.length !== 54) {
    return { ok: false, error: "A cube needs all 54 stickers before it can be solved." };
  }

  /* 1 — counts and centres */
  const counts = Object.fromEntries(FACES.map((f) => [f, 0]));
  for (const letter of facelets) {
    if (!(letter in counts)) {
      return { ok: false, error: "Some stickers haven't been given a colour yet." };
    }
    counts[letter] += 1;
  }
  const miscounted = FACES.filter((f) => counts[f] !== 9);
  if (miscounted.length) {
    const worst = miscounted
      .map((f) => `${colourWord(f)} ${counts[f]}`)
      .join(", ");
    return {
      ok: false,
      error: `Every colour needs exactly nine stickers. Counted ${worst}.`,
    };
  }
  for (let i = 0; i < 6; i += 1) {
    if (facelets[i * 9 + 4] !== FACES[i]) {
      return {
        ok: false,
        error: `The ${colourWord(FACES[i])} centre has changed colour. Centres never move — re-scan that face.`,
        badStickers: [i * 9 + 4],
      };
    }
  }

  /* 2 — real pieces, each used once */
  const cornerPerm = [];
  const cornerOri = [];
  for (let slot = 0; slot < 8; slot += 1) {
    const letters = CORNER_SLOTS[slot].map((i) => facelets[i]);
    const piece = CORNER_PIECES.indexOf(signature(letters));
    if (piece === -1 || cornerPerm.includes(piece)) {
      return {
        ok: false,
        error: `The corner showing ${letters.map(colourWord).join(", ")} isn't a corner this cube has. Check those three stickers.`,
        badStickers: CORNER_SLOTS[slot],
      };
    }
    cornerPerm.push(piece);
    cornerOri.push(letters.findIndex((l) => l === "U" || l === "D"));
  }

  const edgePerm = [];
  const edgeOri = [];
  for (let slot = 0; slot < 12; slot += 1) {
    const letters = EDGE_SLOTS[slot].map((i) => facelets[i]);
    const piece = EDGE_PIECES.indexOf(signature(letters));
    if (piece === -1 || edgePerm.includes(piece)) {
      return {
        ok: false,
        error: `The edge showing ${letters.map(colourWord).join(" and ")} isn't an edge this cube has. Check those two stickers.`,
        badStickers: EDGE_SLOTS[slot],
      };
    }
    edgePerm.push(piece);
    edgeOri.push(letters[0] === primaryOf(letters) ? 0 : 1);
  }

  /* 3 — orientation sums */
  if (cornerOri.reduce((a, b) => a + b, 0) % 3 !== 0) {
    return {
      ok: false,
      error: "One corner is twisted in place. A single corner can't be rotated on its own, so one of its three stickers is wrong.",
    };
  }
  if (edgeOri.reduce((a, b) => a + b, 0) % 2 !== 0) {
    return {
      ok: false,
      error: "One edge is flipped in place. A single edge can't be flipped on its own, so one of its two stickers is wrong.",
    };
  }

  /* 4 — matching parity */
  if (permutationParity(cornerPerm) !== permutationParity(edgePerm)) {
    return {
      ok: false,
      error: "Two pieces are swapped in a way a cube can't reach. Two stickers have most likely been read the wrong way round.",
    };
  }

  return { ok: true };
}

export const isSolved = (facelets) =>
  FACES.every((f, i) => facelets.slice(i * 9, i * 9 + 9) === f.repeat(9));
