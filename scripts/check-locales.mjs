/**
 * Every translation key the code asks for must exist, in all three languages.
 *
 * This exists because a missing key does not crash anything — i18next renders
 * the key itself. So `chat.launcherHint` appeared verbatim in the interface,
 * and only in the language whose file was short. It was found by looking at a
 * screenshot, which is not a process.
 *
 * Run: node scripts/check-locales.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, extname, dirname } from "node:path";

// fileURLToPath, not .pathname — the project lives under "Yoshlar Kapitali",
// and a raw URL pathname keeps the space percent-encoded.
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const LANGUAGES = ["uz", "ru", "en"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if ([".ts", ".tsx"].includes(extname(entry))) out.push(full);
  }
  return out;
}

function flatten(node, prefix = "") {
  const keys = new Set();
  for (const [name, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const nested of flatten(value, path)) keys.add(nested);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

/**
 * Plural suffixes are collapsed before comparing files.
 *
 * Russian has four plural categories (one/few/many/other) where English and
 * Uzbek have two, so `streak.days_few` existing only in Russian is correct
 * i18next, not drift. Comparing raw keys would report every correct plural as
 * an error and train everyone to ignore this check.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const collapse = (keys) => new Set([...keys].map((k) => k.replace(PLURAL_SUFFIX, "_*")));

/**
 * A leaf must not repeat the path it already sits under.
 *
 * `{"plan": {"task": {"plan.task.learn_skill": "…"}}}` looks right in the file
 * and is unreachable: the real path is plan.task.plan.task.learn_skill, so
 * every plan task rendered as its own raw key. The keys above are all looked
 * up through a variable, so the missing-key check below cannot see them —
 * this is a shape check, and it belongs here rather than in a screenshot.
 */
function selfPrefixed(node, path = "") {
  const bad = [];
  for (const [name, value] of Object.entries(node)) {
    const here = path ? `${path}.${name}` : name;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      bad.push(...selfPrefixed(value, here));
    } else if (path && name.startsWith(`${path}.`)) {
      bad.push(here);
    }
  }
  return bad;
}

const files = walk(SRC);

/** Literal keys: t("a.b"), and both halves of t(cond ? "a" : "b"). */
const literal = new Set();
/** Namespaces built at runtime: t(`a.b.${x}`) — the group must exist, not the leaf. */
const dynamic = new Set();

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) literal.add(m[1]);
  for (const m of text.matchAll(/\bt\(\s*[^)]*\?\s*"([a-zA-Z0-9_.]+)"\s*:\s*"([a-zA-Z0-9_.]+)"/g)) {
    literal.add(m[1]);
    literal.add(m[2]);
  }
  for (const m of text.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g)) dynamic.add(m[1]);
}

let failed = false;

for (const language of LANGUAGES) {
  const data = JSON.parse(
    readFileSync(join(SRC, "locales", language, "common.json"), "utf8"),
  );
  const have = flatten(data);

  // A key with a defaultValue is allowed to be absent — that is the documented
  // fallback for server-driven codes, not an oversight.
  const plural = collapse(have);
  const missing = [...literal].filter((key) => {
    if (have.has(key) || plural.has(`${key}_*`)) return false;
    return !files.some((file) =>
      readFileSync(file, "utf8").includes(`"${key}", {\n`) ||
      readFileSync(file, "utf8").includes(`t("${key}", { defaultValue`),
    );
  });

  const nested = selfPrefixed(data);

  const emptyGroups = [...dynamic].filter(
    (group) => ![...have].some((key) => key.startsWith(`${group}.`)),
  );

  if (missing.length || emptyGroups.length || nested.length) {
    failed = true;
    console.error(`\n${language}: MISSING`);
    for (const key of missing.sort()) console.error(`   ${key}`);
    for (const group of emptyGroups.sort()) console.error(`   ${group}.* (empty group)`);
    for (const key of nested.sort())
      console.error(`   ${key} (leaf repeats its own path — unreachable)`);
  } else {
    console.log(`${language}: ok (${have.size} keys)`);
  }
}

// The files must otherwise agree: a key present only in Russian is invisible
// to everyone reading in Uzbek.
const shapes = LANGUAGES.map((language) =>
  flatten(
    JSON.parse(readFileSync(join(SRC, "locales", language, "common.json"), "utf8")),
  ),
);
const collapsed = shapes.map(collapse);
const [reference] = collapsed;
LANGUAGES.forEach((language, index) => {
  const only = [...collapsed[index]].filter((key) => !reference.has(key));
  const absent = [...reference].filter((key) => !collapsed[index].has(key));
  if (only.length || absent.length) {
    failed = true;
    console.error(`\n${language}: drifted from ${LANGUAGES[0]}`);
    for (const key of [...absent].sort()) console.error(`   missing: ${key}`);
    for (const key of [...only].sort()) console.error(`   extra:   ${key}`);
  }
});

if (failed) {
  console.error("\nTranslation check failed.");
  process.exit(1);
}
console.log("\nAll translation keys resolve in every language.");
