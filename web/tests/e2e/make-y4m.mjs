/* Generate a Y4M clip of a cube face so the scan flow can be driven by Chromium's fake
   video device. Testing the camera path against a mocked getUserMedia would only prove
   the mock works; this pushes real frames through the real sampler and classifier. */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const W = 640;
const H = 480;
const FRAMES = 40;

const rgbToYuv = ([r, g, b]) => [
  0.299 * r + 0.587 * g + 0.114 * b,
  -0.168736 * r - 0.331264 * g + 0.5 * b + 128,
  0.5 * r - 0.418688 * g - 0.081312 * b + 128,
];

/** @param {number[][]} grid nine [r,g,b], row-major */
export function renderFace(grid, path) {
  const rgb = new Uint8Array(W * H * 3);
  const tile = 300; // fills the 62% reticle at this frame size
  const x0 = (W - tile) / 2;
  const y0 = (H - tile) / 2;
  const cell = tile / 3;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const inside = x >= x0 && x < x0 + tile && y >= y0 && y < y0 + tile;
      let colour = [18, 18, 20]; // the table behind the cube
      if (inside) {
        const col = Math.min(2, Math.floor((x - x0) / cell));
        const row = Math.min(2, Math.floor((y - y0) / cell));
        // A dark gap between stickers, as a real cube has.
        const gx = (x - x0) % cell;
        const gy = (y - y0) % cell;
        const gap = 10;
        colour =
          gx < gap || gy < gap || gx > cell - gap || gy > cell - gap
            ? [12, 12, 14]
            : grid[row * 3 + col];
      }
      const i = (y * W + x) * 3;
      rgb[i] = colour[0];
      rgb[i + 1] = colour[1];
      rgb[i + 2] = colour[2];
    }
  }

  const ySize = W * H;
  const cSize = (W / 2) * (H / 2);
  const plane = Buffer.alloc(ySize + cSize * 2);

  for (let p = 0; p < ySize; p += 1) {
    plane[p] = Math.round(rgbToYuv([rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]])[0]);
  }
  for (let y = 0; y < H / 2; y += 1) {
    for (let x = 0; x < W / 2; x += 1) {
      const src = (y * 2 * W + x * 2) * 3;
      const [, u, v] = rgbToYuv([rgb[src], rgb[src + 1], rgb[src + 2]]);
      plane[ySize + y * (W / 2) + x] = Math.round(u);
      plane[ySize + cSize + y * (W / 2) + x] = Math.round(v);
    }
  }

  const chunks = [Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`)];
  for (let f = 0; f < FRAMES; f += 1) {
    chunks.push(Buffer.from("FRAME\n"), plane);
  }
  writeFileSync(path, Buffer.concat(chunks));
  return path;
}

const YELLOW = [242, 208, 36];
const RED = [216, 53, 42];
const BLUE = [28, 95, 208];
const GREEN = [20, 160, 90];

/* A yellow-centred face — exactly what step 1 of the scan asks for, so it must lock;
   step 2 asks for green and must reject it by name. */
export const SOLVED_YELLOW_FACE = [
  YELLOW, RED, YELLOW,
  BLUE, YELLOW, GREEN,
  YELLOW, GREEN, RED,
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const defaultOut = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../test-results/face-yellow.y4m",
  );
  const out = process.argv[2] ?? defaultOut;
  mkdirSync(path.dirname(out), { recursive: true });
  renderFace(SOLVED_YELLOW_FACE, out);
  console.log("wrote", out);
}
