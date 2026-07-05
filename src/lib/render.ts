import { BRANDS, type BrandId } from "./palette";
import { shadeHex } from "./color";
import type { Pattern } from "./pattern";

const BOARD_BG = "#FAFAF8";
const PEG_DOT = "rgba(0,0,0,0.06)";
const PEGBOARD = 29; // beads per side of a standard square pegboard

const holeShades = new Map<BrandId, string[]>();

function holeShade(brand: BrandId): string[] {
  let s = holeShades.get(brand);
  if (!s) {
    s = BRANDS[brand].colors.map((c) => shadeHex(c.hex, 0.68));
    holeShades.set(brand, s);
  }
  return s;
}

export interface RenderOptions {
  cell: number;
  grid: boolean;
  /** When set, beads of every other color are faded out. */
  highlight?: number | null;
}

export function renderPattern(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  opts: RenderOptions
): void {
  const { width, height, cells } = pattern;
  const colors = BRANDS[pattern.brand].colors;
  const shades = holeShade(pattern.brand);
  const { cell, grid, highlight = null } = opts;
  const W = width * cell;
  const H = height * cell;

  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, W, H);

  if (grid && cell >= 7) {
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x++) {
      const major = x % 10 === 0;
      const board = x % PEGBOARD === 0 && x > 0 && x < width;
      ctx.strokeStyle = board
        ? "rgba(59,130,246,0.55)"
        : major
          ? "rgba(0,0,0,0.18)"
          : "rgba(0,0,0,0.06)";
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      const major = y % 10 === 0;
      const board = y % PEGBOARD === 0 && y > 0 && y < height;
      ctx.strokeStyle = board
        ? "rgba(59,130,246,0.55)"
        : major
          ? "rgba(0,0,0,0.18)"
          : "rgba(0,0,0,0.06)";
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(W, y * cell + 0.5);
      ctx.stroke();
    }
  }

  const r = cell * 0.46;
  const hole = cell * 0.16;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = cells[y * width + x]!;
      const cx = x * cell + cell / 2;
      const cy = y * cell + cell / 2;
      if (pi < 0) {
        // empty peg
        ctx.fillStyle = PEG_DOT;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, cell * 0.07), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const faded = highlight !== null && pi !== highlight;
      ctx.globalAlpha = faded ? 0.12 : 1;
      ctx.fillStyle = colors[pi]!.hex;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (cell >= 7) {
        ctx.fillStyle = shades[pi]!;
        ctx.beginPath();
        ctx.arc(cx, cy, hole, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

/** Render pattern plus a bead-count legend into a fresh canvas for download. */
export function renderExport(pattern: Pattern, cell = 24): HTMLCanvasElement {
  const colors = BRANDS[pattern.brand].colors;
  const pad = 24;
  const cols = Math.max(1, Math.min(3, Math.ceil(pattern.used.length / 17)));
  const rowH = 30;
  const colW = 240;
  const legendRows = Math.ceil(pattern.used.length / cols);
  const legendH = legendRows * rowH + pad;
  const boardW = pattern.width * cell;
  const boardH = pattern.height * cell;
  const W = Math.max(boardW + pad * 2, cols * colW + pad * 2);
  const H = boardH + legendH + pad * 2 + 20;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(pad, pad);
  renderPattern(ctx, pattern, { cell, grid: true });
  ctx.restore();

  ctx.font = "600 15px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  const top = boardH + pad + 30;
  pattern.used.forEach((u, i) => {
    const cx = pad + Math.floor(i / legendRows) * colW;
    const cy = top + (i % legendRows) * rowH;
    ctx.fillStyle = colors[u.index]!.hex;
    ctx.beginPath();
    ctx.arc(cx + 10, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.fillText(`${colors[u.index]!.name} × ${u.count}`, cx + 28, cy);
  });
  return canvas;
}
