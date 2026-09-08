/**
 * The test tree's type-check enumeration, checked against the tree.
 *
 * `tsconfig.tests.json#include` is an ENUMERATION rather than `tests/**\/*.ts`, and its own
 * `$comment` gives the measured reason: a whole-tree glob reports hundreds of pre-existing errors in
 * suites the enumeration never touched. So the list is the boundary between what is checked and
 * what is not — and a boundary that nothing checks drifts.
 *
 * A suite SPLIT out of an enumerated file (e.g. when that file grows too slow to run in one
 * worker) can be left off the enumeration just as easily as a newly added one. `pnpm check-types`
 * reads only this config for the test tree and Vitest does not type-check at runtime, so a suite
 * left off carries no type check at all and the required job would still be green.
 *
 * What these rows pin is narrow on purpose. A census of all 490 test files, split into checked and
 * unchecked, would make every addition a visible diff — but it is 426 lines of inventory that goes
 * stale on its own, and is not what the enumeration owns. The split case IS checkable without one: a
 * file named for an enumerated sibling in the same directory is a piece of that sibling, and it
 * belongs wherever the sibling belongs.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_REL = "tsconfig.tests.json";

/** The `include` list, read through the comments the file is allowed to carry. */
function enumeratedTests(): string[] {
  const raw = readFileSync(path.join(PACKAGE_ROOT, CONFIG_REL), "utf-8");
  const withoutComments = raw.replace(/^\s*\/\/.*$/gm, "");
  const parsed: unknown = JSON.parse(withoutComments);
  if (parsed === null || typeof parsed !== "object" || !("include" in parsed)) {
    throw new Error(`${CONFIG_REL} declares no include list`);
  }
  const include = (parsed as { include: unknown }).include;
  if (!Array.isArray(include)) throw new Error(`${CONFIG_REL}#include is not an array`);
  return include.filter((entry): entry is string => typeof entry === "string");
}

describe("the test tree's type-check enumeration", () => {
  it("names only files that exist", () => {
    // The other direction, and it costs nothing: a renamed or deleted suite leaves an entry behind
    // that reads like coverage and checks nothing.
    const missing = enumeratedTests().filter((rel) => !existsSync(path.join(PACKAGE_ROOT, rel)));
    expect(missing, `${CONFIG_REL} enumerates paths that are not in the tree`).toEqual([]);
  });

  it("holds every sibling split out of a file it already names", () => {
    // Review finding [120]. `workflowHygiene.test.ts` was enumerated and
    // `workflowHygieneRequiredContext.test.ts` — split out of it in the same change — was not, so the
    // required type-check job read none of it.
    //
    // A split sibling is recognised by NAME: same directory, and a basename that extends an
    // enumerated basename. That is what a split produces, in this repository and in general, and it
    // is decidable from the tree with no git history and no inventory of the other 426 files.
    const enumerated = enumeratedTests();
    const enumeratedSet = new Set(enumerated);

    const unenumerated: string[] = [];
    for (const rel of enumerated) {
      if (!rel.endsWith(".test.ts")) continue;
      const dir = path.dirname(rel);
      const stem = path.basename(rel, ".test.ts");
      let entries: string[];
      try {
        entries = readdirSync(path.join(PACKAGE_ROOT, dir));
      } catch {
        continue; // the row above reports a missing path; this one does not double-report it
      }
      for (const entry of entries) {
        if (!entry.endsWith(".test.ts")) continue;
        const siblingStem = path.basename(entry, ".test.ts");
        if (siblingStem === stem || !siblingStem.startsWith(stem)) continue;
        const siblingRel = `${dir}/${entry}`;
        if (enumeratedSet.has(siblingRel)) continue;
        unenumerated.push(`${siblingRel} (split from ${rel})`);
      }
    }

    expect(
      unenumerated.sort(),
      `${CONFIG_REL} names a file but not the sibling split out of it, so the required type-check ` +
        "job reads one half of a suite and not the other",
    ).toEqual([]);
  });
  it("holds every suite that enforces a shipped-asset budget", () => {
    // `assets.test.ts` owns the 500-line shipped-asset ceiling. Left outside
    // the enumeration, the guard that keeps the shipped surface honest would
    // be the one thing nothing type-checks.
    //
    // The rule is decidable from the tree without an inventory: a suite that
    // imports the budget helper is enforcing the budget, and a budget guard
    // that is not type-checked is the shape this row exists to prevent. It is
    // deliberately narrower than "every test file" — the file's own docstring
    // gives the measured reason a census was rejected.
    const enumeratedSet = new Set(enumeratedTests());
    const unchecked: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(path.join(PACKAGE_ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(rel);
          continue;
        }
        if (!entry.name.endsWith(".test.ts")) continue;
        const body = readFileSync(path.join(PACKAGE_ROOT, rel), "utf-8");
        // The two names the budget reaches a suite under: the shared helper,
        // and the constant it re-exports from the shipping module.
        if (!/helpers\/skillBudget|ASSISTANT_ASSET_MAX_LINES|SKILL_MD_MAX_LINES/.test(body)) {
          continue;
        }
        if (!enumeratedSet.has(rel)) unchecked.push(rel);
      }
    };
    walk("tests");

    expect(
      unchecked.sort(),
      `${CONFIG_REL} leaves a shipped-asset budget guard un-type-checked, which is how the suite ` +
        "that polices the 500-line ceiling came to carry a TS2345 of its own (#1066)",
    ).toEqual([]);
  });
});
