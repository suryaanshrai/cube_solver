/**
 * Is there a cube face in the reticle, and is it the right one?
 *
 * The previous version of this gate asked one question — does the *centre* cell look like
 * the colour we asked for — and a white t-shirt in front of a grey wall answered yes. It
 * also rewarded the wrong thing: a propped phone pointed at a wall is perfectly stable,
 * while a cube held in the hand is the case that struggles.
 *
 * Three independent signals now have to agree, and they fail in an order that produces a
 * sentence the user can act on rather than a generic refusal:
 *
 *   1. Structure. A cube face has dark plastic between its stickers; a wall, a shirt and
 *      a face do not. This is the check that does most of the work, because it is the
 *      only one that cares about *shape* rather than colour.
 *   2. Every cell, not just the centre. All nine have to read as some cube colour. On an
 *      unsolved cube they will legitimately be nine different colours, so this never asks
 *      them to agree with each other — only to each be a colour a sticker can be.
 *   3. The centre, judged against centres already banked in this scan rather than against
 *      fixed hue bands. That is what separates orange from red under a warm bulb.
 */

import {
  AMBIGUOUS_WITH,
  CELL_MARGIN,
  PAIR_SEPARATION,
  cellColour,
  deltaE94,
  rgbToLab,
} from "./classify.js";
import { MIN_LUMINANCE } from "./sampler.js";

/** Gutters this much darker than the squares, relatively and absolutely, means a cube. */
export const MIN_CONTRAST = 0.28;
export const MIN_DELTA = 18;
/** Below this there is nothing grid-shaped in the reticle at all. */
export const LOOSE_CONTRAST = 0.12;
/** A centre this close to its runner-up is a coin toss, not a reading. */
export const CENTRE_MARGIN = 4;
/** One cell may be washed out by a highlight; two means the read is not trustworthy. */
export const MAX_WEAK_CELLS = 1;

const wait = (text, extra) => ({ ok: false, tone: "wait", text, ...extra });
const warn = (text, extra) => ({ ok: false, tone: "warn", text, ...extra });

/**
 * @param {object|null} reading  a `sampleFace` result, plus `stable`
 * @param {object} options
 * @param {string} options.expected     the colour name this step asked for
 * @param {Record<string, number[]>} [options.seeds]  colour name → banked centre Lab
 * @returns {{ok: boolean, tone: string, text: string, score: number, colours?: object[]}}
 */
export function detectFace(reading, { expected, seeds = null, stable = false } = {}) {
  if (!reading) return wait("Starting the camera…", { score: 0 });

  if (reading.luminance < MIN_LUMINANCE) {
    return warn("Too dark to read colours — find more light", { score: 0 });
  }

  const structure = reading.structure ?? { contrast: 0, delta: 0 };
  if (structure.contrast < LOOSE_CONTRAST) {
    return wait("Point the square at a cube face", { score: 0 });
  }
  if (structure.contrast < MIN_CONTRAST || structure.delta < MIN_DELTA) {
    return wait("Line the cube up with the square", { score: 0.2 });
  }

  const colours = reading.samples.map((rgb) => cellColour(rgb, { seeds }));

  const unreadable = colours.filter((c) => c.name === null);
  if (unreadable.length) {
    const dark = unreadable.some((c) => c.reason === "dark");
    return wait(
      dark
        ? "Part of the square is in shadow — fill it with the face"
        : "Only part of the face is in the square",
      { score: 0.3, colours },
    );
  }

  const weak = colours.filter((c) => c.margin < CELL_MARGIN);
  if (weak.length > MAX_WEAK_CELLS) {
    return wait("Colours are washing out — steadier light will fix it", {
      score: 0.4,
      colours,
    });
  }

  const centre = colours[4];
  const twin = AMBIGUOUS_WITH[expected];

  if (centre.name !== expected) {
    /* Before the twin of an ambiguous pair has been scanned there is nothing to measure
       the difference against, so the whole family is admitted rather than guessed at.
       The scan order puts red before orange and yellow before white, which means the
       ambiguous one of each pair always arrives *second*, with its twin already banked —
       and by then this branch is not needed. */
    const familyOpen = twin === centre.name && seeds && !seeds[expected] && !seeds[twin];
    if (!familyOpen) {
      const named =
        twin === centre.name && seeds?.[centre.name]
          ? `Expected ${expected} · this reads as the ${centre.name} face you already scanned`
          : `Expected ${expected} · seeing ${centre.name}`;
      return warn(named, { score: 0.5, colours });
    }
  } else if (centre.margin < CENTRE_MARGIN) {
    return wait(`Not sure that is ${expected} yet — steady the cube`, { score: 0.6, colours });
  }

  if (!stable) return wait("Hold still…", { score: 0.8, colours });

  return { ok: true, tone: "ready", text: "Centre locked", score: 1, colours };
}

/**
 * Once every face is banked, did the two confusable pairs actually come out distinct?
 *
 * If red and orange were read as near-identical colours then one of the two faces was
 * almost certainly presented twice, and no amount of downstream cleverness recovers it.
 * Better to say so on the last confirm screen, where going back costs one tap.
 *
 * @param {Record<string, number[]>} seeds  colour name → banked centre Lab
 * @returns {string|null} a sentence, or null when the pairs are well separated
 */
export function pairWarning(seeds) {
  if (!seeds) return null;
  const seen = new Set();
  for (const [a, b] of Object.entries(AMBIGUOUS_WITH)) {
    const key = [a, b].sort().join("/");
    if (seen.has(key) || !seeds[a] || !seeds[b]) continue;
    seen.add(key);
    if (deltaE94(seeds[a], seeds[b]) < PAIR_SEPARATION) {
      return `The ${a} and ${b} centres read almost identically. Check those two faces before solving.`;
    }
  }
  return null;
}

/** Bank a confirmed centre so later faces are judged against this cube, not a constant. */
export function seedFrom(captures) {
  const seeds = {};
  for (const capture of captures) {
    if (capture) seeds[capture.colour] = rgbToLab(capture.samples[4]);
  }
  return seeds;
}
