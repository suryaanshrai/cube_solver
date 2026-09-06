/**
 * Reading sticker colours off a camera frame.
 *
 * Fixed HSV thresholds are the usual approach and the usual reason cube scanners fail:
 * a red sticker under warm tungsten and an orange sticker under cold daylight land in
 * the same bucket, and nothing about the frame tells you which you're looking at.
 *
 * This classifies *relatively* instead. Three things make it hold up:
 *
 *   1. The six centre stickers are known — the scan flow tells the user which face to
 *      present, so their measured colours are ground truth for this cube, this dye
 *      batch, and this room. They seed the six clusters.
 *   2. Each face is normalised by its own mean lightness before comparison, because
 *      six faces photographed in sequence are six different exposures.
 *   3. A cube has exactly nine of each colour, so assignment is capacity-constrained
 *      rather than nearest-neighbour. A sticker that "wants" a colour already used
 *      nine times goes to its next best, which fixes most single misreads for free.
 *
 * Every sticker also carries the margin between its best and second-best fit, so the
 * review grid can flag the ones worth a human glance rather than asking for all 54.
 */

import { FACES } from "../cube/facelets.js";

/* ── colour space ─────────────────────────────────────────────────────────── */

const linearise = (c) => {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};

const PIVOT = 216 / 24389;
const f = (t) => (t > PIVOT ? Math.cbrt(t) : (24389 / 27) * t / 116 + 16 / 116);

/** sRGB (0–255) to CIELAB under D65. */
export function rgbToLab([r, g, b]) {
  const R = linearise(r);
  const G = linearise(g);
  const B = linearise(b);

  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * CIE94 difference, with lightness deliberately de-weighted (kL = 2.5).
 *
 * Exposure varies far more between six handheld captures than hue does, so lightness is
 * the least trustworthy of the three channels. Chroma and hue carry the decision, which
 * is what separates white from yellow and red from orange.
 */
export function deltaE94(a, b, kL = 2.5) {
  const [L1, a1, b1] = a;
  const [L2, a2, b2] = b;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);

  const dL = L1 - L2;
  const dC = C1 - C2;
  const da = a1 - a2;
  const db = b1 - b2;
  const dH2 = Math.max(0, da * da + db * db - dC * dC);

  const sC = 1 + 0.045 * C1;
  const sH = 1 + 0.015 * C1;

  return Math.sqrt((dL / kL) ** 2 + (dC / sC) ** 2 + dH2 / (sH * sH));
}

/* ── the coarse pass, used before any calibration exists ──────────────────── */

export function rgbToHsv([r, g, b]) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) * 60;
    else if (max === G) h = ((B - R) / d + 2) * 60;
    else h = ((R - G) / d + 4) * 60;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

/**
 * Best-effort single-sample colour name, with no calibration to lean on.
 *
 * Only used for the live "is the right face pointing at me?" check during aiming, where
 * being roughly right immediately beats being exactly right too late. The committed
 * reading always goes through `classifyCube`.
 */
export function coarseColour([r, g, b]) {
  const [h, s, v] = rgbToHsv([r, g, b]);
  if (v < 0.16) return null; // too dark to call
  if (s < 0.28) return "white";
  if (h < 12 || h >= 345) return "red";
  if (h < 40) return "orange";
  if (h < 72) return "yellow";
  if (h < 170) return "green";
  if (h < 265) return "blue";
  return "red";
}

/* ── the committed pass ───────────────────────────────────────────────────── */

const CENTRE = 4;

/**
 * @param {Record<string, number[][]>} samplesByFace  face letter → nine [r,g,b] samples,
 *   in facelet reading order. Faces are keyed by the face they were captured *as*, which
 *   the scan flow guarantees by telling the user which centre to present.
 * @returns {{facelets: string, confidence: number[], seeds: Record<string, number[]>}}
 */
export function classifyCube(samplesByFace) {
  const cells = [];
  for (const face of FACES) {
    const samples = samplesByFace[face];
    if (!samples || samples.length !== 9) {
      throw new Error(`Face ${face} has no complete reading.`);
    }
    samples.forEach((rgb, cell) => {
      cells.push({ face, cell, index: FACES.indexOf(face) * 9 + cell, lab: rgbToLab(rgb) });
    });
  }

  /* 2 — normalise each face's exposure onto the common mean */
  const globalL = cells.reduce((sum, c) => sum + c.lab[0], 0) / cells.length;
  for (const face of FACES) {
    const faceCells = cells.filter((c) => c.face === face);
    const faceL = faceCells.reduce((sum, c) => sum + c.lab[0], 0) / faceCells.length;
    const shift = globalL - faceL;
    for (const c of faceCells) c.lab = [c.lab[0] + shift, c.lab[1], c.lab[2]];
  }

  /* 1 — centres are ground truth */
  let seeds = Object.fromEntries(
    FACES.map((face) => [face, cells.find((c) => c.face === face && c.cell === CENTRE).lab]),
  );

  /* Two refinement rounds: assign, recompute centroids, assign again. Centres stay
     pinned to their own face throughout, so a round can sharpen a seed but never
     rename a face. */
  let assignment = assign(cells, seeds);
  for (let round = 0; round < 2; round += 1) {
    seeds = centroids(cells, assignment, seeds);
    assignment = assign(cells, seeds);
  }

  const facelets = new Array(54);
  const confidence = new Array(54);
  for (const entry of assignment) {
    facelets[entry.index] = entry.face;
    confidence[entry.index] = entry.margin;
  }

  return { facelets: facelets.join(""), confidence, seeds };
}

/** Mean Lab per assigned colour, falling back to the seed when a colour is unassigned. */
function centroids(cells, assignment, seeds) {
  const byFace = Object.fromEntries(FACES.map((face) => [face, []]));
  assignment.forEach((entry, i) => byFace[entry.face].push(cells[i].lab));

  return Object.fromEntries(
    FACES.map((face) => {
      const group = byFace[face];
      if (!group.length) return [face, seeds[face]];
      const mean = group
        .reduce((acc, lab) => [acc[0] + lab[0], acc[1] + lab[1], acc[2] + lab[2]], [0, 0, 0])
        .map((v) => v / group.length);
      return [face, mean];
    }),
  );
}

/**
 * 3 — capacity-constrained assignment.
 *
 * Cheapest-first with a cap of nine per colour, then a local swap pass. A full Hungarian
 * solve would be exact, but with six well-separated clusters the greedy result is
 * already optimal or one swap away, and this stays readable.
 */
function assign(cells, seeds) {
  const costs = cells.map((c) => FACES.map((face) => deltaE94(c.lab, seeds[face])));

  const result = new Array(cells.length).fill(null);
  const used = Object.fromEntries(FACES.map((face) => [face, 0]));

  // Centres are fixed: a centre sticker is its own face by definition.
  cells.forEach((c, i) => {
    if (c.cell === CENTRE) {
      result[i] = c.face;
      used[c.face] += 1;
    }
  });

  const candidates = [];
  cells.forEach((c, i) => {
    if (c.cell === CENTRE) return;
    FACES.forEach((face, f) => candidates.push({ i, face, cost: costs[i][f] }));
  });
  candidates.sort((a, b) => a.cost - b.cost);

  for (const { i, face } of candidates) {
    if (result[i] !== null || used[face] >= 9) continue;
    result[i] = face;
    used[face] += 1;
  }

  // Local repair: swap any pair whose colours are cheaper the other way round.
  const costOf = (i, face) => costs[i][FACES.indexOf(face)];
  for (let pass = 0; pass < 3; pass += 1) {
    let improved = false;
    for (let i = 0; i < cells.length; i += 1) {
      if (cells[i].cell === CENTRE) continue;
      for (let j = i + 1; j < cells.length; j += 1) {
        if (cells[j].cell === CENTRE || result[i] === result[j]) continue;
        const now = costOf(i, result[i]) + costOf(j, result[j]);
        const swapped = costOf(i, result[j]) + costOf(j, result[i]);
        if (swapped < now - 1e-9) {
          [result[i], result[j]] = [result[j], result[i]];
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return cells.map((c, i) => {
    const ordered = [...costs[i]].sort((a, b) => a - b);
    const chosen = costOf(i, result[i]);
    // How much better the runner-up would have to be. Small margin, worth a human look.
    const margin = c.cell === CENTRE ? Infinity : Math.max(0, ordered[1] - chosen);
    return { index: c.index, face: result[i], margin };
  });
}

/** Confidence below this is flagged for review rather than trusted. */
export const UNCERTAIN_MARGIN = 4.5;
