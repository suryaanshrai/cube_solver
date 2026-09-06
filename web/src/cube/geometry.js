/**
 * Cube geometry — the single source of truth for both the facelet permutations and
 * the 3D renderer.
 *
 * Rather than hand-typing 18 permutation tables (which is how sticker bugs get in and
 * stay in), everything here is derived from coordinates. A sticker knows the cubie it
 * sits on and the direction it faces; a turn rotates both. The permutation tables in
 * `moves.js` fall out of that, and the renderer reads the same table to place stickers.
 *
 * Coordinates: x right, y up, z toward the viewer. Cubie coordinates are integers in
 * {-1, 0, 1}. A face's outward normal doubles as its identity.
 *
 * Facelet strings use Kociemba's URFDLB ordering: nine characters per face, row-major,
 * each face read from outside with the conventional "up" direction (U with Back at the
 * top of the reading, D with Front at the top, the four side faces with Up at the top).
 */

export const FACES = ["U", "R", "F", "D", "L", "B"];

/** Outward normal, and the reading basis used to lay out that face's 3×3. */
const FACE_FRAME = {
  U: { n: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
  R: { n: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  F: { n: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
  D: { n: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
  L: { n: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  B: { n: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
};

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const key = (v) => `${v[0]},${v[1]},${v[2]}`;

/**
 * Rotate an integer vector a quarter turn about a unit axis.
 *
 * Rodrigues with cos = 0 collapses to `n(n·v) ± (n × v)`, which stays exact in integers
 * — no floating point ever enters the permutation tables.
 *
 * @param {number[]} v vector to rotate
 * @param {number[]} n unit axis (an outward face normal)
 * @param {number} turns +1 for a counter-clockwise quarter turn about n (right-hand rule)
 */
export function rotateQuarter(v, n, turns) {
  const axial = scale(n, dot(n, v));
  const perp = cross(n, v);
  return turns > 0 ? add(axial, perp) : add(axial, scale(perp, -1));
}

/**
 * The 54 stickers, in facelet-string order.
 * Each entry: { index, face, row, col, cubie: [x,y,z], normal: [x,y,z] }
 */
export const STICKERS = FACES.flatMap((face, f) => {
  const { n, right, up } = FACE_FRAME[face];
  const cells = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      cells.push({
        index: f * 9 + row * 3 + col,
        face,
        row,
        col,
        cubie: add(n, add(scale(right, col - 1), scale(up, 1 - row))),
        normal: n,
      });
    }
  }
  return cells;
});

/** ("x,y,z" of cubie) + "|" + ("x,y,z" of normal)  ->  facelet index */
const STICKER_LOOKUP = new Map(
  STICKERS.map((s) => [`${key(s.cubie)}|${key(s.normal)}`, s.index]),
);

export function stickerIndexAt(cubie, normal) {
  const found = STICKER_LOOKUP.get(`${key(cubie)}|${key(normal)}`);
  if (found === undefined) {
    throw new Error(`No sticker at cubie ${key(cubie)} facing ${key(normal)}`);
  }
  return found;
}

/** The 26 visible cubies (the core is never rendered). */
export const CUBIES = (() => {
  const out = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue;
        const stickers = STICKERS.filter(
          (s) => key(s.cubie) === key([x, y, z]),
        ).map((s) => ({ index: s.index, face: s.face, normal: s.normal }));
        out.push({ id: key([x, y, z]), position: [x, y, z], stickers });
      }
    }
  }
  return out;
})();

export const FACE_NORMAL = Object.fromEntries(
  FACES.map((f) => [f, FACE_FRAME[f].n]),
);

export { dot, cross, key };
