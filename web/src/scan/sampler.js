/**
 * Turning a video frame into nine sticker readings — and into evidence that a cube is
 * actually there.
 *
 * Each cell is read as the *median* of a small patch rather than the mean. Cube plastic
 * is glossy, so a patch will often contain a specular highlight — a handful of near-white
 * pixels that drag a mean towards white and turn a yellow sticker into a white one. The
 * median ignores them.
 *
 * The frame also carries a *structure* reading. Nine colours alone cannot tell a cube
 * from a wall or a t-shirt: what distinguishes a cube face is the dark plastic between
 * the stickers. Two vertical and two horizontal gutters, at a third and two thirds across,
 * markedly darker than the squares they separate. That is measured here, over a small
 * search of offsets so the user does not have to line the cube up to the pixel — and the
 * best-fitting offset is then what the nine samples are read from, which makes the
 * reading better as well as the gate stricter.
 *
 * Everything works off one `getImageData` of a downscaled crop. Pulling the pixels once
 * and doing the arithmetic in JS is far cheaper per frame than the dozen small reads the
 * previous version issued, which matters on a phone.
 */

/** Working resolution of the reticle crop. Large enough to read, small enough to be free. */
const WORK = 180;
/** Odd, so there is a true centre pixel. Side of the median patch taken inside each cell. */
const PATCH = 15;
/** Half-width of the strip sampled along each gutter line. */
const STRIP = 2;
/** Alignment search, as a fraction of the crop, on each axis. */
const OFFSETS = [-0.05, -0.025, 0, 0.025, 0.05];
/** Stride along a gutter line. Every third pixel is plenty and a third of the work. */
const LINE_STRIDE = 3;

/** The square the reticle occupies, in the video's own pixel coordinates. */
export function reticleRect(videoWidth, videoHeight, fraction = 0.62) {
  const size = Math.min(videoWidth, videoHeight) * fraction;
  return {
    x: (videoWidth - size) / 2,
    y: (videoHeight - size) / 2,
    size,
  };
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[values.length >> 1];
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * @returns {{
 *   samples: number[][], luminance: number, spread: number,
 *   structure: {contrast: number, delta: number, offset: number[]},
 * }}
 *   `samples` is nine [r,g,b] in facelet reading order; `luminance` is the mean over the
 *   whole reticle (used to refuse a capture in the dark); `spread` is how varied the
 *   frame is; `structure` is how cube-like the frame's geometry is — see `detect.js`.
 */
export function sampleFace(video, canvas, { fraction = 0.62 } = {}) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rect = reticleRect(width, height, fraction);

  canvas.width = WORK;
  canvas.height = WORK;

  /* The frame is sampled exactly as the camera delivers it, front camera or back. A
     photograph of a cube already has the cube's geometry the right way round — the same
     way a person sitting opposite would see it — and the scan sequence names the faces
     from the camera's point of view. Flipping for a front camera swapped the left and
     right column of every face and produced a cube that was not the one on the table. */
  ctx.drawImage(video, rect.x, rect.y, rect.size, rect.size, 0, 0, WORK, WORK);

  return readCrop(ctx.getImageData(0, 0, WORK, WORK).data);
}

/**
 * The measurement itself, over a WORK×WORK RGBA buffer.
 *
 * Exported so it can be tested against synthetic frames without a canvas or a camera.
 */
export function readCrop(data, size = WORK) {
  const lum = new Float32Array(size * size);
  for (let p = 0, i = 0; p < lum.length; p += 1, i += 4) {
    lum[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }

  const cell = size / 3;
  const half = (PATCH - 1) / 2;

  /** Median luminance of the patch at the centre of one cell, for a given alignment. */
  const cellLum = (ox, oy, row, col) => {
    const cx = Math.round(ox + cell * (col + 0.5));
    const cy = Math.round(oy + cell * (row + 0.5));
    const values = [];
    for (let y = cy - half; y <= cy + half; y += 1) {
      if (y < 0 || y >= size) continue;
      for (let x = cx - half; x <= cx + half; x += 1) {
        if (x < 0 || x >= size) continue;
        values.push(lum[y * size + x]);
      }
    }
    return values.length ? median(values) : 0;
  };

  /** Median luminance along the four interior divider lines, for a given alignment. */
  const gutterLum = (ox, oy) => {
    const values = [];
    for (const k of [1, 2]) {
      const gx = Math.round(ox + cell * k);
      const gy = Math.round(oy + cell * k);
      for (let t = 0; t < size; t += LINE_STRIDE) {
        for (let s = -STRIP; s <= STRIP; s += 1) {
          const x = gx + s;
          if (x >= 0 && x < size) values.push(lum[t * size + x]);
          const y = gy + s;
          if (y >= 0 && y < size) values.push(lum[y * size + t]);
        }
      }
    }
    return values.length ? median(values) : 0;
  };

  /* Pick the alignment whose gutters are darkest relative to the squares they separate.
     On a real cube this locks onto the plastic; on a wall every offset scores the same
     nothing, which is precisely the signal we want. */
  let best = { contrast: -Infinity, delta: -Infinity, offset: [0, 0], interior: 0 };
  const span = OFFSETS.map((f) => Math.round(f * size));
  for (const oy of span) {
    for (const ox of span) {
      const interiors = [];
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) interiors.push(cellLum(ox, oy, row, col));
      }
      const interior = median([...interiors]);
      const gutter = gutterLum(ox, oy);
      const delta = interior - gutter;
      const contrast = interior > 1 ? delta / interior : 0;
      if (contrast > best.contrast) best = { contrast, delta, offset: [ox, oy], interior };
    }
  }

  const [ox, oy] = best.offset;
  const samples = [];
  let luminanceSum = 0;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const cx = clamp(Math.round(ox + cell * (col + 0.5)), half, size - 1 - half);
      const cy = clamp(Math.round(oy + cell * (row + 0.5)), half, size - 1 - half);

      const r = [];
      const g = [];
      const b = [];
      for (let y = cy - half; y <= cy + half; y += 1) {
        for (let x = cx - half; x <= cx + half; x += 1) {
          const i = (y * size + x) * 4;
          r.push(data[i]);
          g.push(data[i + 1]);
          b.push(data[i + 2]);
        }
      }
      const rgb = [median(r), median(g), median(b)];
      samples.push(rgb);
      luminanceSum += 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }
  }

  const luminance = luminanceSum / 9;
  const perCell = samples.map(([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b);
  const spread = Math.max(...perCell) - Math.min(...perCell);

  return {
    samples,
    luminance,
    spread,
    structure: { contrast: best.contrast, delta: best.delta, offset: best.offset },
  };
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
/** Below this the reticle is looking at a flat field, not a cube. */
export const MIN_SPREAD = 8;
