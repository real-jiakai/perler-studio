// Regenerates src/lib/palette.ts from the community-maintained beadcolors
// dataset (github.com/maxcleme/beadcolors). Run: node scripts/gen-palette.mjs
import { writeFileSync } from "node:fs";

const BASE = "https://beadcolors.eremes.xyz/raw";

async function fetchCsv(name) {
  const res = await fetch(`${BASE}/${name}.csv`);
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

const midi = await fetchCsv("perler");
const mini = await fetchCsv("perler_mini");

const byName = new Map();
for (const c of midi) if (!byName.has(norm(c.name))) byName.set(norm(c.name), c);
for (const c of mini) if (!byName.has(norm(c.name))) byName.set(norm(c.name), c);

const order = ["solid", "pearl", "translucent", "neon", "metallic", "glitter", "glow", "striped", "other"];
const all = [...byName.values()]
  .map((c) => ({ code: c.code, name: c.name, hex: hex(c), family: family(c.name) }))
  .sort(
    (a, b) =>
      order.indexOf(a.family) - order.indexOf(b.family) ||
      a.name.localeCompare(b.name)
  );

const lines = all.map(
  (c) =>
    `  { code: "${c.code}", name: "${c.name.replace(/"/g, '\\"')}", hex: "${c.hex}", family: "${c.family}" },`
);

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
  /** Official Perler product code. */
  code: string;
  name: string;
  hex: string;
  family: BeadFamily;
}

// Complete current Perler bead catalog. Measured RGB values from the
// community-maintained beadcolors dataset (github.com/maxcleme/beadcolors),
// midi palette merged with mini-only colors. Regenerate: scripts/gen-palette.
export const PERLER_COLORS: BeadColor[] = [
${lines.join("\n")}
];
`
);
console.log(`palette.ts written: ${all.length} colors`);
