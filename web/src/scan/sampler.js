/**
 * Turning a video frame into nine sticker readings.
 *
 * Each cell is read as the *median* of a small patch rather than the mean. Cube plastic
 * is glossy, so a patch will often contain a specular highlight — a handful of near-white
 * pixels that drag a mean towards white and turn a yellow sticker into a white one. The
 * median ignores them.
 */

const PATCH = 11; // odd, so there is a true centre pixel

/** The square the reticle occupies, in the video's own pixel coordinates. */
export function reticleRect(videoWidth, videoHeight, fraction = 0.62) {
  const size = Math.min(videoWidth, videoHeight) * fraction;
  return {
    x: (videoWidth - size) / 2,
    y: (videoHeight - size) / 2,
    size,
  };
}

function medianChannel(values) {
  values.sort((a, b) => a - b);
  return values[values.length >> 1];
}

/**
 * @returns {{samples: number[][], luminance: number, spread: number}}
 *   `samples` is nine [r,g,b] in facelet reading order; `luminance` is the mean over the
 *   whole reticle (used to refuse a capture in the dark) and `spread` is how varied the
 *   frame is (a flat frame means nothing is actually in view).
 */
export function sampleFace(video, canvas, { fraction = 0.62, mirrored = false } = {}) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rect = reticleRect(width, height, fraction);

  canvas.width = Math.round(rect.size);
  canvas.height = Math.round(rect.size);

  ctx.save();
  if (mirrored) {
    // A front-facing camera is previewed mirrored, so it must be un-mirrored before
    // sampling or the left and right columns of every face come back swapped.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, rect.x, rect.y, rect.size, rect.size, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  const cell = canvas.width / 3;
  const half = (PATCH - 1) / 2;
  const samples = [];
  let luminanceSum = 0;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const cx = Math.round(cell * (col + 0.5));
      const cy = Math.round(cell * (row + 0.5));
      const patch = ctx.getImageData(
        Math.max(0, cx - half),
        Math.max(0, cy - half),
        PATCH,
        PATCH,
      ).data;

      const r = [];
      const g = [];
      const b = [];
      for (let i = 0; i < patch.length; i += 4) {
        r.push(patch[i]);
        g.push(patch[i + 1]);
        b.push(patch[i + 2]);
      }
      const rgb = [medianChannel(r), medianChannel(g), medianChannel(b)];
      samples.push(rgb);
      luminanceSum += 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }
  }

  const luminance = luminanceSum / 9;
  const perCell = samples.map(([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b);
  const spread = Math.max(...perCell) - Math.min(...perCell);

  return { samples, luminance, spread };
}

/**
 * Is the cube being held still enough to trust?
 *
 * Keeps a short history of readings and reports the largest channel movement across it.
 * Auto-capture waits for that to settle, which is a far better signal than a timer —
 * it fires the moment the user stops moving rather than a fixed beat later.
 */
export function createStabilityTracker({ frames = 12, tolerance = 11 } = {}) {
  let history = [];

  return {
    reset() {
      history = [];
    },
    /** @returns {{stable: boolean, drift: number, filled: number}} */
    push(samples) {
      history.push(samples);
      if (history.length > frames) history.shift();
      if (history.length < frames) {
        return { stable: false, drift: Infinity, filled: history.length / frames };
      }

      let drift = 0;
      for (let cell = 0; cell < 9; cell += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          const series = history.map((frame) => frame[cell][channel]);
          drift = Math.max(drift, Math.max(...series) - Math.min(...series));
        }
      }
      return { stable: drift <= tolerance, drift, filled: 1 };
    },
  };
}

/** Below this the frame is too dark to classify honestly. */
export const MIN_LUMINANCE = 42;
/** Below this the reticle is looking at a wall, not a cube. */
export const MIN_SPREAD = 8;
