/**
 * Synthetic camera test.
 *
 * Real sticker readings are never the nominal colour: each face is a separate exposure,
 * rooms have a colour cast, and glare lifts individual samples. This feeds the
 * classifier 54 samples built from a known cube with all three distortions applied and
 * checks the string comes back intact.
 */

import { describe, it, expect } from "vitest";
import { classifyCube, rgbToLab, deltaE94, coarseColour } from "./classify.js";
import { FACES, splitFacelets } from "../cube/facelets.js";
import fixtures from "../cube/fixtures.json";

/** Roughly what a camera sees off standard cube plastic in neutral light. */
const NOMINAL = {
  U: [232, 200, 40], // yellow
  R: [26, 152, 88], // green
  F: [200, 52, 42], // red
  D: [232, 234, 232], // white
  L: [32, 92, 190], // blue
  B: [226, 118, 34], // orange
};

function makeSampler(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * @param exposure   per-face brightness multiplier — six handheld captures, six exposures
 * @param cast       per-face RGB multiplier — warm lamp on one side, daylight on the other
 * @param noise      per-sample jitter in 0–255 units
 */
function synthesise(facelets, { exposure, cast, noise, rnd }) {
  const byFace = splitFacelets(facelets);
  return Object.fromEntries(
    FACES.map((face, f) =>
      [
        face,
        byFace[face].map((letter) =>
          NOMINAL[letter].map((channel, c) => {
            const value =
              channel * exposure[f] * cast[f][c] + (rnd() - 0.5) * 2 * noise;
            return Math.max(0, Math.min(255, Math.round(value)));
          }),
        ),
      ],
    ),
  );
}

const flat = () => ({
  exposure: [1, 1, 1, 1, 1, 1],
  cast: Array.from({ length: 6 }, () => [1, 1, 1]),
  noise: 0,
  rnd: () => 0.5,
});

describe("colour space", () => {
  it("puts white at the top of the lightness axis with no chroma", () => {
    const [L, a, b] = rgbToLab([255, 255, 255]);
    expect(L).toBeCloseTo(100, 0);
    expect(Math.hypot(a, b)).toBeLessThan(1);
  });

  it("separates red from orange further than it separates two reds", () => {
    const red = rgbToLab(NOMINAL.F);
    const orange = rgbToLab(NOMINAL.B);
    const otherRed = rgbToLab([186, 44, 38]);
    expect(deltaE94(red, orange)).toBeGreaterThan(deltaE94(red, otherRed) * 3);
  });

  it("names the six cube colours from a clean sample", () => {
    expect(coarseColour(NOMINAL.U)).toBe("yellow");
    expect(coarseColour(NOMINAL.R)).toBe("green");
    expect(coarseColour(NOMINAL.F)).toBe("red");
    expect(coarseColour(NOMINAL.D)).toBe("white");
    expect(coarseColour(NOMINAL.L)).toBe("blue");
    expect(coarseColour(NOMINAL.B)).toBe("orange");
  });

  it("declines to guess in the dark rather than guessing wrong", () => {
    expect(coarseColour([9, 8, 10])).toBeNull();
  });
});

describe("classifying a scanned cube", () => {
  const scrambles = fixtures.filter((f) => f.kind === "scramble").slice(0, 20);

  it("recovers the exact cube from clean samples", () => {
    for (const fixture of scrambles) {
      const samples = synthesise(fixture.facelets, flat());
      expect(classifyCube(samples).facelets).toBe(fixture.facelets);
    }
  });

  it("recovers the cube through per-face exposure differences", () => {
    for (const fixture of scrambles) {
      const rnd = makeSampler(7);
      const samples = synthesise(fixture.facelets, {
        ...flat(),
        exposure: [0.72, 0.88, 1.0, 1.18, 0.94, 1.3],
        rnd,
      });
      expect(classifyCube(samples).facelets).toBe(fixture.facelets);
    }
  });

  it("recovers the cube through a warm-to-cool colour cast and sensor noise", () => {
    let recovered = 0;
    for (const fixture of scrambles) {
      const rnd = makeSampler(11);
      const samples = synthesise(fixture.facelets, {
        exposure: [0.8, 0.95, 1.12, 1.0, 0.88, 1.22],
        cast: [
          [1.1, 1.0, 0.88], // warm
          [1.05, 1.0, 0.94],
          [1.0, 1.0, 1.0],
          [0.94, 1.0, 1.08], // cool
          [0.98, 1.0, 1.04],
          [1.08, 1.0, 0.9],
        ],
        noise: 14,
        rnd,
      });
      if (classifyCube(samples).facelets === fixture.facelets) recovered += 1;
    }
    expect(recovered).toBe(scrambles.length);
  });

  it("always returns nine of every colour, even when it is wrong", () => {
    const rnd = makeSampler(3);
    const samples = synthesise(scrambles[0].facelets, {
      exposure: [1, 1, 1, 1, 1, 1],
      cast: Array.from({ length: 6 }, () => [1, 1, 1]),
      noise: 60, // well past anything a real capture would pass
      rnd,
    });
    const { facelets } = classifyCube(samples);
    for (const face of FACES) {
      expect([...facelets].filter((c) => c === face)).toHaveLength(9);
    }
  });

  it("flags its uncertain stickers instead of hiding them", () => {
    const rnd = makeSampler(5);
    const samples = synthesise(scrambles[1].facelets, {
      exposure: [1, 1, 1, 1, 1, 1],
      cast: Array.from({ length: 6 }, () => [1, 1, 1]),
      noise: 55,
      rnd,
    });
    const { facelets, confidence } = classifyCube(samples);
    const wrong = [...facelets].map((c, i) => (c === scrambles[1].facelets[i] ? null : i)).filter((i) => i !== null);
    if (wrong.length) {
      // Anything misread should be among the least confident readings.
      const ranked = confidence
        .map((margin, i) => ({ margin, i }))
        .sort((a, b) => a.margin - b.margin)
        .slice(0, 18)
        .map((entry) => entry.i);
      expect(wrong.some((i) => ranked.includes(i))).toBe(true);
    }
    expect(confidence).toHaveLength(54);
  });

  it("refuses an incomplete reading", () => {
    expect(() => classifyCube({ U: [] })).toThrow(/complete reading/);
  });
});
