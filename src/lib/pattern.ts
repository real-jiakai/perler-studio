import { PERLER_COLORS } from "./palette";
import { nearestBead, paletteRgb } from "./color";

export interface Pattern {
  width: number;
  height: number;
  /** Palette index per cell, -1 = empty (transparent in the source). */
  cells: Int16Array;
  /** Colors actually used, sorted by bead count descending. */
  used: { index: number; count: number }[];
  totalBeads: number;
}

export interface PatternOptions {
  dither: boolean;
}

/**
 * Quantize a grid-sized ImageData to the Perler palette.
 * With dithering enabled, Floyd–Steinberg error diffusion runs over the
 * bead grid; error is never propagated into or out of empty cells.
 */
export function generatePattern(
  img: ImageData,
  opts: PatternOptions
): Pattern {
  const { width, height, data } = img;
  const n = width * height;
  const cells = new Int16Array(n).fill(-1);
  const counts = new Array<number>(PERLER_COLORS.length).fill(0);

  // Float working copy so dither error accumulates without clipping.
  const buf = new Float32Array(n * 3);
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (data[p + 3]! >= 128) {
      solid[i] = 1;
      buf[i * 3] = data[p]!;
      buf[i * 3 + 1] = data[p + 1]!;
      buf[i * 3 + 2] = data[p + 2]!;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!solid[i]) continue;
      const r = buf[i * 3]!;
      const g = buf[i * 3 + 1]!;
      const b = buf[i * 3 + 2]!;
      const pi = nearestBead(r, g, b);
      cells[i] = pi;
      counts[pi]!++;
      if (!opts.dither) continue;
      const [pr, pg, pb] = paletteRgb[pi]!;
      const er = r - pr;
      const eg = g - pg;
      const eb = b - pb;
      const spread = (xx: number, yy: number, w: number) => {
        if (xx < 0 || xx >= width || yy >= height) return;
        const j = yy * width + xx;
        if (!solid[j]) return;
        buf[j * 3] += er * w;
        buf[j * 3 + 1] += eg * w;
        buf[j * 3 + 2] += eb * w;
      };
      spread(x + 1, y, 7 / 16);
      spread(x - 1, y + 1, 3 / 16);
      spread(x, y + 1, 5 / 16);
      spread(x + 1, y + 1, 1 / 16);
    }
  }

  const used = counts
    .map((count, index) => ({ index, count }))
    .filter((u) => u.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    width,
    height,
    cells,
    used,
    totalBeads: used.reduce((s, u) => s + u.count, 0),
  };
}
