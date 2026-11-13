#!/usr/bin/env node
/* global console, process */
/**
 * Refuses the type gate when a test suite is in neither half of the test tree's type-check
 * boundary.
 *
 * `packages/qfai/tsconfig.tests.json#include` is an enumeration, and
 * `packages/qfai/tests/scripts/typeCheckEnumeration.allowlist.ts` records the suites it knowingly
 * leaves out. A suite in neither is typed by nothing. The Vitest suite
 * `tests/scripts/testTypeCheckEnumeration.test.ts` already reports it, but only CI runs that suite,
 * so the omission surfaced one CI round after the push. `pnpm check-types` runs this first, so the
 * same omission fails the local check every contributor is told to run.
 *
 * It reads files and compiles nothing. The allowlist is TypeScript, and this program reads its
 * string literals rather than importing it, so the lane needs no TypeScript loader.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const packageRoot = path.join(repoRoot, "packages", "qfai");

const CONFIG_REL = "tsconfig.tests.json";
const ALLOWLIST_REL = "tests/scripts/typeCheckEnumeration.allowlist.ts";

/** The `include` list of the test config, read through the line comments it may carry. */
export function parseInclude(configText) {
  const parsed = JSON.parse(String(configText).replace(/^\s*\/\/.*$/gmu, ""));
  if (parsed === null || typeof parsed !== "object" || !Array.isArray(parsed.include)) {
    throw new Error(`${CONFIG_REL} declares no include array`);
  }
  return parsed.include.filter((entry) => typeof entry === "string");
}

/** The paths the allowlist's array holds: every double-quoted string inside its brackets. */
export function parseAllowlist(allowlistText) {
  const text = String(allowlistText);
  const start = text.indexOf("= [");
  const end = start === -1 ? -1 : text.indexOf("];", start);
  if (start === -1 || end === -1) {
    throw new Error(`${ALLOWLIST_REL} declares no array this check can read`);
  }
  return [...text.slice(start, end).matchAll(/"([^"\\]+)"/gu)].map((match) => match[1]);
}

/**
 * What is wrong with the boundary, one line per problem, or an empty list.
 *
 * `suites` are the `*.test.ts` files in the tree; every argument is a list of package-relative
 * POSIX paths. The three directions are the ones the Vitest suite asserts.
 */
export function enumerationProblems({ suites, include, allowlist, exists }) {
  const enumerated = new Set(include);
  const accounted = new Set([...include, ...allowlist]);
  const present = new Set(suites);
  return [
    ...suites
      .filter((rel) => !accounted.has(rel))
      .map((rel) => `${rel} is in neither ${CONFIG_REL}#include nor ${ALLOWLIST_REL}`),
    ...include
      .filter((rel) => !exists(rel))
      .map((rel) => `${CONFIG_REL}#include names ${rel}, which is not in the tree`),
    ...allowlist
      .filter((rel) => enumerated.has(rel) || !present.has(rel))
      .map((rel) => `${ALLOWLIST_REL} records ${rel} as uncovered, and it is now covered or gone`),
  ];
}

/** Every `*.test.ts` under `tests/`, package-relative with `/` separators. */
function suitesInTree(root) {
  const found = [];
  const walk = (rel) => {
    for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith(".test.ts")) found.push(child);
    }
  };
  walk("tests");
  return found.sort();
}

function main() {
  const problems = enumerationProblems({
    suites: suitesInTree(packageRoot),
    include: parseInclude(readFileSync(path.join(packageRoot, CONFIG_REL), "utf-8")),
    allowlist: parseAllowlist(readFileSync(path.join(packageRoot, ALLOWLIST_REL), "utf-8")),
    exists: (rel) => existsSync(path.join(packageRoot, rel)),
  });
  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-test-enumeration: ${problem}`);
    console.error(
      `check-test-enumeration: add a new suite to packages/qfai/${CONFIG_REL}#include, and strike a line from the allowlist in the change that covers or removes its suite.`,
    );
    process.exit(1);
  }
  console.log("check-test-enumeration: every test suite is enumerated or recorded as uncovered");
}

// Importing this file reads its rules; running it reads the tree.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
