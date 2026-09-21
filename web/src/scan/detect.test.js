/**
 * The capture gate, against frames that should and should not be allowed through.
 *
 * Two of these reproduce bugs reported against the live site: a white t-shirt in front of
 * a grey wall captured happily as a cube face, and an orange centre under a warm bulb was
 * refused as red. Both are here as frames rather than as unit assertions on a helper, so
 * that a future change to the thresholds has to keep answering them correctly.
 */

import { describe, it, expect } from "vitest";
import { readCrop } from "./sampler.js";
import { detectFace, pairWarning, seedFrom } from "./detect.js";
import { rgbToLab } from "./classify.js";

const SIZE = 180;
const CELL = SIZE / 3;

/** Paint a SIZE×SIZE RGBA buffer from a function of x and y. */
function paint(fn) {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const [r, g, b] = fn(x, y);
      const i = (y * SIZE + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** A cube face: nine squares separated by dark plastic. */
const cubeFace = (cells, { gap = 6 } = {}) =>
  paint((x, y) => {
    const gx = x % CELL;
    const gy = y % CELL;
    if (gx < gap || gy < gap || gx > CELL - gap || gy > CELL - gap) return [14, 14, 16];
    return cells[Math.floor(y / CELL) * 3 + Math.floor(x / CELL)];
  });

/** The same nine colours with no plastic between them — colour without structure. */
const flatPanels = (cells) =>
  paint((x, y) => cells[Math.floor(y / CELL) * 3 + Math.floor(x / CELL)]);

const solid = (rgb) => paint(() => rgb);
const nine = (rgb) => Array(9).fill(rgb);

const read = (data, options) => detectFace(readCrop(data, SIZE), options);

const BLUE = [30, 96, 206];
const RED = [190, 44, 36];
const WARM_ORANGE = [236, 104, 40];

describe("detectFace", () => {
  it("accepts a cube face showing the colour that was asked for", () => {
    const verdict = read(cubeFace(nine(BLUE)), { expected: "blue", stable: true });
    expect(verdict.ok).toBe(true);
    expect(verdict.colours[4].name).toBe("blue");
  });

  it("accepts an unsolved face — nine different colours is normal", () => {
    const cells = [
      [232, 200, 40],
      [26, 152, 88],
      [200, 52, 42],
      [232, 234, 232],
      BLUE,
      [226, 118, 34],
      [26, 152, 88],
      [232, 200, 40],
      [200, 52, 42],
    ];
    expect(read(cubeFace(cells), { expected: "blue", stable: true }).ok).toBe(true);
  });

  it("holds until the reading settles", () => {
    const verdict = read(cubeFace(nine(BLUE)), { expected: "blue", stable: false });
    expect(verdict.ok).toBe(false);
    expect(verdict.text).toMatch(/hold still/i);
  });

  it("refuses a flat wall", () => {
    const verdict = read(solid([196, 198, 200]), { expected: "blue", stable: true });
    expect(verdict.ok).toBe(false);
    expect(verdict.text).toMatch(/cube face/i);
  });

  /* The reported bug: a white t-shirt and a grey wall captured as a cube face. */
  it("refuses a person in a lit room", () => {
    const room = paint((x, y) => {
      if (y > SIZE * 0.6) return [228, 226, 222]; // a white t-shirt
      if (x < SIZE * 0.4) return [176, 172, 168]; // a wall
      return [62, 54, 48]; // hair, a chair back
    });
    const verdict = read(room, { expected: "blue", stable: true });
    expect(verdict.ok).toBe(false);
  });

  it("refuses the right colours with no plastic between them", () => {
    const verdict = read(flatPanels(nine(BLUE)), { expected: "blue", stable: true });
    expect(verdict.ok).toBe(false);
    expect(verdict.text).toMatch(/cube face|line the cube/i);
  });

  it("refuses a cube face showing the wrong colour, and names what it sees", () => {
    const verdict = read(cubeFace(nine(BLUE)), { expected: "green", stable: true });
    expect(verdict.ok).toBe(false);
    expect(verdict.text).toMatch(/expected green/i);
    expect(verdict.text).toMatch(/blue/i);
  });

  it("refuses a frame too dark to read", () => {
    const verdict = read(cubeFace(nine([20, 22, 26])), { expected: "blue", stable: true });
    expect(verdict.ok).toBe(false);
    expect(verdict.text).toMatch(/dark/i);
  });

  /* The other reported bug: orange read as red. With the red centre already banked, the
     two are measured against each other rather than against a fixed hue boundary. */
  describe("red and orange", () => {
    const seeds = { red: rgbToLab(RED) };

    it("admits a warm-lit orange centre once red has been scanned", () => {
      const verdict = read(cubeFace(nine(WARM_ORANGE)), {
        expected: "orange",
        seeds,
        stable: true,
      });
      expect(verdict.ok).toBe(true);
      expect(verdict.colours[4].name).toBe("orange");
    });

    it("still refuses the red face when orange was asked for", () => {
      const verdict = read(cubeFace(nine(RED)), { expected: "orange", seeds, stable: true });
      expect(verdict.ok).toBe(false);
      expect(verdict.text).toMatch(/already scanned/i);
    });

    it("admits either member of the pair before the first of them is banked", () => {
      const verdict = read(cubeFace(nine(WARM_ORANGE)), {
        expected: "red",
        seeds: {},
        stable: true,
      });
      expect(verdict.ok).toBe(true);
    });
  });
});

describe("pairWarning", () => {
  it("says nothing when the pairs came out distinct", () => {
    expect(
      pairWarning({ red: rgbToLab(RED), orange: rgbToLab([235, 123, 28]) }),
    ).toBeNull();
  });

  it("flags two faces that read as the same colour", () => {
    expect(pairWarning({ red: rgbToLab(RED), orange: rgbToLab([192, 46, 38]) })).toMatch(
      /red and orange/i,
    );
  });
});

describe("seedFrom", () => {
  it("banks the centre of each confirmed capture under its colour", () => {
    const seeds = seedFrom([
      { colour: "yellow", samples: Array(9).fill([232, 200, 40]) },
      null,
      { colour: "red", samples: Array(9).fill(RED) },
    ]);
    expect(Object.keys(seeds).sort()).toEqual(["red", "yellow"]);
    expect(seeds.red).toEqual(rgbToLab(RED));
  });
});
