/**
 * Every text token must clear its target on every ground it can land on.
 *
 * This exists because the interface is frosted glass, and glass moved the
 * goalposts in a way that is invisible from the stylesheet. On an opaque
 * design there is one ground per surface and you can check a colour by
 * looking at it. On this one a panel is 68% opaque over a five-colour aurora,
 * so what text actually sits on is a *composite* that changes with whatever
 * is behind the panel — and the composite is always darker than the page.
 *
 * That gap is not small. Solved against the page alone, ink-500 measures
 * 5.23:1 there and 4.18:1 on glass over the periwinkle. It is the most-used
 * token in the product. It would have shipped failing in the place it is most
 * often read, and nothing in the build would have said so.
 *
 * So this script reads the real values out of index.css and glass.css — not a
 * copy of them kept somewhere else, which would drift — recomputes the
 * composites from the aurora stops and the panel alphas, and audits every
 * token against all three grounds in both themes.
 *
 * Run: node scripts/check-contrast.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// fileURLToPath, not .pathname — the project lives under "Yoshlar Kapitali",
// and a raw URL pathname keeps the space percent-encoded.
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/* ------------------------------------------------------------------ colour */

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

function channel(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** sRGB alpha composite — what a translucent panel over a backdrop resolves to. */
function composite(fg, bg, alpha) {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  const mix = f.map((v, i) => v * alpha + b[i] * (1 - alpha));
  return (
    "#" +
    mix
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v * 255)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}

/* ------------------------------------------------------- read the real CSS */

const indexCss = readFileSync(join(SRC, "index.css"), "utf8");
const glassCss = readFileSync(join(SRC, "shared", "styles", "glass.css"), "utf8");

/**
 * Tokens are pulled out of the block that defines them rather than by a global
 * search, because both themes declare the same names and a global search would
 * silently return whichever came last.
 */
function block(css, opener) {
  const start = css.indexOf(opener);
  if (start === -1) throw new Error(`missing block: ${opener}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i);
  }
  throw new Error(`unterminated block: ${opener}`);
}

function vars(source, prefix) {
  const out = {};
  const re = new RegExp(`--${prefix}([\\w-]+)\\s*:\\s*([^;]+);`, "g");
  let m;
  while ((m = re.exec(source))) out[m[1]] = m[2].trim();
  return out;
}

const LIGHT_TOKENS = vars(block(indexCss, "@theme"), "color-");
const DARK_TOKENS = vars(block(indexCss, ':root[data-theme="dark"]'), "color-");
const LIGHT_GLASS = vars(block(glassCss, ":root {"), "");
const DARK_GLASS = vars(block(glassCss, ':root[data-theme="dark"]'), "");

function pct(value) {
  return parseFloat(value) / 100;
}

/* ------------------------------------------------------------ what to check */

/**
 * Targets, and why each is what it is.
 *
 * 3:1 is the WCAG floor for a graphic that carries meaning and for text at
 * 24px or 19px bold. 4.5:1 is body text. ink-400 is decorative only — it is
 * used for icons and rules, never for a sentence — which is the one token
 * allowed to sit at 3.
 */
const TARGETS = [
  ["ink-400", 3.0, "decorative grey: icons, rules, disabled marks"],
  ["ink-500", 4.5, "secondary text — the most-used token in the product"],
  ["ink-600", 4.5, "body text"],
  ["ink-700", 4.5, "strong body"],
  ["ink-800", 4.5, "headings"],
  ["ink-900", 4.5, "the darkest heading"],
  ["brand-700", 4.5, "link text"],
  ["brand-800", 4.5, "strong brand text"],
  ["brand-900", 4.5, "brand headings"],
  ["accent-solid", 3.0, "the pink that carries meaning — a bar, a marker"],
  ["accent-ink", 4.5, "the pink that carries text"],
  ["success", 4.5, "semantic text"],
  ["warning", 4.5, "semantic text"],
  ["danger", 4.5, "semantic text — appears on role=alert messages"],
  ["info", 4.5, "semantic text"],
];

/** Fills. These are checked to confirm they are NOT used as text anywhere. */
const FILLS = ["accent", "accent-soft", "brand-200", "brand-300"];

const failures = [];
const notes = [];

function audit(themeName, tokens, glass) {
  const page = tokens["ink-50"];
  const card = tokens.surface;
  const alpha = pct(glass["glass-alpha"]);
  const strength = pct(glass["aurora-strength"]);

  /*
   * The aurora reaches the page at `--aurora-strength`, so the backdrop behind
   * a panel is the stop mixed down over the page, not the raw stop. Then the
   * panel composites over that. Two steps, in the order the browser paints
   * them — collapsing them into one was an earlier bug that made the grounds
   * look better than they are.
   */
  const grounds = { page, card };
  for (let i = 1; i <= 5; i++) {
    const stop = glass[`aurora-${i}`];
    if (!stop) continue;
    const backdrop = composite(stop, page, strength);
    grounds[`glass over aurora-${i}`] = composite(card, backdrop, alpha);
  }

  const glassGrounds = Object.entries(grounds).filter(([n]) => n.startsWith("glass"));
  const worst = glassGrounds.sort(
    (a, b) =>
      (themeName === "light" ? 1 : -1) * (luminance(a[1]) - luminance(b[1])),
  )[0];

  console.log(`\n${themeName}`);
  console.log(`  page ${page}   card ${card}   panel ${glass["glass-alpha"]} opaque`);
  console.log(`  worst glass composite: ${worst[1]}  (${worst[0]})`);

  for (const [name, target, why] of TARGETS) {
    const colour = tokens[name];
    if (!colour) {
      failures.push(`${themeName}: token --color-${name} is missing`);
      continue;
    }
    let low = Infinity;
    let lowGround = "";
    for (const [groundName, ground] of Object.entries(grounds)) {
      const r = ratio(colour, ground);
      if (r < low) {
        low = r;
        lowGround = groundName;
      }
    }
    const pass = low >= target;
    if (!pass) {
      failures.push(
        `${themeName}: --color-${name} ${colour} measures ${low.toFixed(2)}:1 on ` +
          `${lowGround} — needs ${target}:1 (${why})`,
      );
    }
    console.log(
      `  ${pass ? "ok  " : "FAIL"} ${name.padEnd(13)} ${colour}  ` +
        `worst ${low.toFixed(2)}:1 on ${lowGround}`,
    );
  }

  /*
   * The fills are the five pastels and the pale end of the ramp. They are
   * allowed to fail — that is what makes them fills — but the number is
   * printed so nobody has to rediscover it by trying to use one as a label.
   */
  for (const name of FILLS) {
    const colour = tokens[name];
    if (!colour) continue;
    notes.push(
      `${themeName}: --color-${name} ${colour} is ${ratio(colour, page).toFixed(2)}:1 ` +
        `on the page — FILL ONLY, never text`,
    );
  }

  /*
   * The action fills.
   *
   * These are the pastels themselves — the palette doing the interface's
   * work rather than a saturated colour derived from it — so the pair that
   * has to hold is dark ink on a light ground, the opposite way round from
   * everywhere else. Checked against ALL five aurora stops, not just the
   * nominal fill, because the same ink is used on every tile and chip.
   */
  const onBrand = tokens["on-brand"];
  /*
   * Only the two fills, deliberately.
   *
   * An earlier version of this check also measured on-brand against the five
   * aurora stops and failed the dark theme at 1.01:1 — correctly arithmetic
   * and wrong about the design. In the dark theme those stops are the page
   * wash, and the ink that goes on a tile made from one is ink-800, not this.
   * A check that tests a pair the product never renders reports a bug that
   * does not exist, which is worse than not checking: it gets silenced.
   */
  const fills = {
    "brand-fill": tokens["brand-fill"],
    "brand-fill-hover": tokens["brand-fill-hover"],
  };
  let lowFill = Infinity;
  let lowFillName = "";
  for (const [name, fill] of Object.entries(fills)) {
    if (!fill) continue;
    const r = ratio(onBrand, fill);
    if (r < lowFill) {
      lowFill = r;
      lowFillName = name;
    }
  }
  if (lowFill < 4.5) {
    failures.push(
      `${themeName}: --color-on-brand ${onBrand} measures ${lowFill.toFixed(2)}:1 on ` +
        `${lowFillName} — needs 4.5:1. A pastel fill carries dark ink; if the ink ` +
        `no longer clears, the button has no label.`,
    );
  }
  console.log(
    `  ${lowFill >= 4.5 ? "ok  " : "FAIL"} ${"on-brand".padEnd(13)} ${onBrand}  ` +
      `worst ${lowFill.toFixed(2)}:1 on ${lowFillName}`,
  );

  /*
   * A pastel measures 1.2–1.7:1 against a pale page, so it cannot be its own
   * boundary. The edge is what gives a filled control a shape, and a control
   * boundary answers to 3:1.
   */
  const edge = tokens["brand-edge"];
  if (edge) {
    const rEdge = Math.min(ratio(edge, page), ratio(edge, card));
    if (rEdge < 3.0) {
      failures.push(
        `${themeName}: --color-brand-edge ${edge} measures ${rEdge.toFixed(2)}:1 — ` +
          `needs 3:1. Without it a pastel button has no visible edge.`,
      );
    }
    console.log(
      `  ${rEdge >= 3.0 ? "ok  " : "FAIL"} ${"brand-edge".padEnd(13)} ${edge}  ` +
        `${rEdge.toFixed(2)}:1 as a control boundary`,
    );
  }

  /*
   * The icon tiles: one aurora stop at 62% over the surface, holding an
   * ink-800 glyph. This is the element that carries the palette into a screen
   * that is otherwise near-white panels, so it appears everywhere — and it is
   * the one pair whose ground changes per theme while the ink does too.
   * A mark answers to 3:1.
   */
  const tileInk = tokens["ink-800"];
  let lowTile = Infinity;
  let lowTileName = "";
  for (let i = 1; i <= 5; i++) {
    const stop = glass[`aurora-${i}`];
    if (!stop) continue;
    const tile = composite(stop, card, 0.62);
    const r = ratio(tileInk, tile);
    if (r < lowTile) {
      lowTile = r;
      lowTileName = `aurora-${i}`;
    }
  }
  if (lowTile < 3.0) {
    failures.push(
      `${themeName}: the icon tile glyph (--color-ink-800 ${tileInk}) measures ` +
        `${lowTile.toFixed(2)}:1 on a ${lowTileName} tile — needs 3:1`,
    );
  }
  console.log(
    `  ${lowTile >= 3.0 ? "ok  " : "FAIL"} ${"tile glyph".padEnd(13)} ${tileInk}  ` +
      `worst ${lowTile.toFixed(2)}:1 on a ${lowTileName} tile`,
  );

  /* Text on the saturated semantic grounds, which are opaque and single-ground. */
  const onColour = tokens["on-colour"];
  const r = ratio(onColour, tokens.danger);
  if (r < 4.5) {
    failures.push(
      `${themeName}: --color-on-colour ${onColour} measures ${r.toFixed(2)}:1 on ` +
        `--color-danger ${tokens.danger} — needs 4.5:1`,
    );
  }
  console.log(
    `  ${r >= 4.5 ? "ok  " : "FAIL"} ${"on-colour".padEnd(13)} ${onColour}  ` +
      `${r.toFixed(2)}:1 on the danger ground`,
  );
}

console.log("Contrast — every text token on every ground it can land on.");
audit("light", LIGHT_TOKENS, LIGHT_GLASS);
audit("dark", { ...LIGHT_TOKENS, ...DARK_TOKENS }, { ...LIGHT_GLASS, ...DARK_GLASS });

console.log("\nFills (expected to fail as text — that is the point):");
for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.error(`\n${failures.length} contrast failure(s):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nRaising --aurora-strength or lowering --glass-alpha moves the ground\n" +
      "these were solved against. If you changed either, the tokens have to be\n" +
      "solved again — they are not independent.\n",
  );
  process.exit(1);
}

console.log("\nEvery text token clears its target on page, card and glass, in both themes.");
