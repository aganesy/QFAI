/* global console, process */
/**
 * The IDs this repository declares that also fall inside the sample band.
 *
 * The distributed-surface guards allow an ID whose segments are all 0001 to
 * 0009, because `qfai init` shows such IDs as samples. This repository's own
 * spec tree uses the same numbers for real contracts and rules, so a shipped
 * file that cites one of them points at a document that exists here and means
 * something else in an adopter's project. Only what the spec tree declares is
 * rejected: a business-rule ID that opens a row of a contract table or an `id`
 * of a contract rule, and the file name of a contract.
 *
 * Every guard reads this module, so they cannot disagree about the set.
 *
 * Usage:
 *   node packages/qfai/scripts/lib/declared-sample-band-ids.mjs
 *     prints one extended regular expression that matches any declared ID.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BR_ROW = /^\|\s*(BR-000[1-9]-000[1-9])\s*\|/gm;
const BR_YAML = /^\s*-?\s*id:\s*(BR-000[1-9]-000[1-9])\s*$/gm;
const CONTRACT_NAME = /^((?:cli|api|db|ui)-000[1-9]-[A-Za-z0-9][A-Za-z0-9-]*)\.[a-z]+$/;

/** The repository root, found from this module's own location. */
export function repoRootFromHere() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

function walk(dir, visit) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, visit);
    else visit(full, entry);
  }
}

/**
 * Declared sample-band business-rule IDs and contract names under
 * `<repoRoot>/.qfai/spec/03_contract`. Both lists are empty when that
 * directory does not exist, as in a package checked out on its own.
 *
 * @param {string} repoRoot
 * @returns {{ businessRules: string[]; contractNames: string[] }}
 */
export function declaredSampleBandIds(repoRoot) {
  const rules = new Set();
  const names = new Set();
  walk(path.join(repoRoot, ".qfai", "spec", "03_contract"), (file, base) => {
    const name = CONTRACT_NAME.exec(base);
    if (name) names.add(name[1]);
    if (!/\.(?:md|ya?ml)$/.test(base)) return;
    const text = readFileSync(file, "utf-8");
    for (const pattern of [BR_ROW, BR_YAML]) {
      for (const match of text.matchAll(pattern)) rules.add(match[1]);
    }
  });
  return { businessRules: [...rules].sort(), contractNames: [...names].sort() };
}

/**
 * One extended regular expression, valid for `grep -E` and for JavaScript,
 * that matches any declared ID, or `null` when there is none.
 *
 * A business-rule ID is matched whole. A contract name is matched only where
 * no letter, digit, `_` or `-` precedes it, and not when more of the name
 * follows, so a longer name is not read as a declared one.
 *
 * @param {string} repoRoot
 * @returns {string | null}
 */
export function declaredSampleBandPattern(repoRoot) {
  const { businessRules, contractNames } = declaredSampleBandIds(repoRoot);
  const parts = [];
  if (businessRules.length > 0) parts.push(String.raw`\b(${businessRules.join("|")})\b`);
  if (contractNames.length > 0) {
    parts.push(`(^|[^A-Za-z0-9_-])(${contractNames.join("|")})($|[^A-Za-z0-9_-])`);
  }
  return parts.length === 0 ? null : parts.join("|");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pattern = declaredSampleBandPattern(repoRootFromHere());
  if (pattern !== null) console.log(pattern);
}
