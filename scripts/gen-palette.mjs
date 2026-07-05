// Regenerates src/lib/palette.ts from public bead color datasets:
//   - Perler: community-maintained beadcolors dataset (github.com/maxcleme/beadcolors)
//   - MARD 221: bitbead.app color chart (www.bitbead.app/en/colors/mard)
// Run: node scripts/gen-palette.mjs
import { writeFileSync } from "node:fs";

// ---- Perler (beadcolors CSVs) ----

const BEADCOLORS = "https://beadcolors.eremes.xyz/raw";

async function fetchCsv(name) {
  const res = await fetch(`${BEADCOLORS}/${name}.csv`);
  if (!res.ok) throw new Error(`${name}.csv: HTTP ${res.status}`);
  return (await res.text())
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const [code, colorName, r, g, b] = line.split(",");
      return { code, name: colorName.trim(), r: +r, g: +g, b: +b };
    });
}

const hex = (c) =>
  "#" +
  [c.r, c.g, c.b]
    .map((v) => v.toString(16).padStart(2, "0").toUpperCase())
    .join("");

function family(name) {
  if (/pearl/i.test(name)) return "pearl";
  if (/glitter|sparkle/i.test(name)) return "glitter";
  if (/glow/i.test(name)) return "glow";
  if (/trans(lucent)?[ -]|clear/i.test(name)) return "translucent";
  if (/neon/i.test(name)) return "neon";
  if (/metallic|silver(?!\w)|copper|bronze/i.test(name)) return "metallic";
  if (/stripe/i.test(name)) return "striped";
  if (/speckle|tweed|marble/i.test(name)) return "other";
  return "solid";
}

const norm = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, "");

async function perlerColors() {
  const midi = await fetchCsv("perler");
  const mini = await fetchCsv("perler_mini");
  const byName = new Map();
  for (const c of midi)
    if (!byName.has(norm(c.name))) byName.set(norm(c.name), c);
  for (const c of mini)
    if (!byName.has(norm(c.name))) byName.set(norm(c.name), c);

  const order = ["solid", "pearl", "translucent", "neon", "metallic", "glitter", "glow", "striped", "other"];
  return [...byName.values()]
    .map((c) => ({ code: c.code, name: c.name, hex: hex(c), family: family(c.name) }))
    .sort(
      (a, b) =>
        order.indexOf(a.family) - order.indexOf(b.family) ||
        a.name.localeCompare(b.name)
    );
}

// ---- MARD 221 (bitbead.app chart) ----

async function mardColors() {
  const res = await fetch("https://www.bitbead.app/en/colors/mard");
  if (!res.ok) throw new Error(`bitbead: HTTP ${res.status}`);
  const html = await res.text();
  const cardRe =
    /class="truncate font-medium text-body">([^<]{1,40})<\/div><div class="font-mono text-body">(#[0-9A-Fa-f]{6})/g;
  const out = [];
  let m;
  while ((m = cardRe.exec(html)))
    out.push({ code: m[1], name: m[1], hex: m[2].toUpperCase(), family: "solid" });
  if (out.length !== new Set(out.map((c) => c.code)).size)
    throw new Error("duplicate MARD codes scraped");
  // sort by series letter then numeric part: A1, A2, ... B1, ...
  out.sort((a, b) => {
    const [, as, an] = a.code.match(/^([A-Z]+)(\d+)$/) ?? [, a.code, 0];
    const [, bs, bn] = b.code.match(/^([A-Z]+)(\d+)$/) ?? [, b.code, 0];
    return as.localeCompare(bs) || +an - +bn;
  });
  return out;
}

// ---- emit palette.ts ----

const entry = (c) =>
  `  { code: "${c.code}", name: "${c.name.replace(/"/g, '\\"')}", hex: "${c.hex}", family: "${c.family}" },`;

const [perler, mard] = await Promise.all([perlerColors(), mardColors()]);

writeFileSync(
  new URL("../src/lib/palette.ts", import.meta.url),
  `export type BeadFamily =
  | "solid"
  | "pearl"
  | "translucent"
  | "neon"
  | "metallic"
  | "glitter"
  | "glow"
  | "striped"
  | "other";

export interface BeadColor {
  /** Brand color code (Perler product code / MARD series code). */
  code: string;
  name: string;
  hex: string;
  family: BeadFamily;
}

// GENERATED FILE — do not edit by hand. Regenerate: node scripts/gen-palette.mjs
//
// Perler: complete current catalog, measured RGB from the community-maintained
// beadcolors dataset (github.com/maxcleme/beadcolors).
// MARD 221: complete A–M series chart from bitbead.app.

export const PERLER_COLORS: BeadColor[] = [
${perler.map(entry).join("\n")}
];

export const MARD_COLORS: BeadColor[] = [
${mard.map(entry).join("\n")}
];

export const BRANDS = {
  perler: { label: "Perler", colors: PERLER_COLORS },
  mard: { label: "MARD 221", colors: MARD_COLORS },
} as const;

export type BrandId = keyof typeof BRANDS;
`
);
console.log(`palette.ts written: ${perler.length} Perler + ${mard.length} MARD`);
