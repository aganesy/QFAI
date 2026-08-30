/**
 * The test tree's type-check enumeration, checked against the tree.
 *
 * `tsconfig.tests.json#include` is an ENUMERATION rather than `tests/**\/*.ts`, and its own
 * `$comment` gives the measured reason: a whole-tree glob reports hundreds of pre-existing errors in
 * suites this change never touched. So the list is the boundary between what this change owns and
 * what it does not — and a boundary that nothing checks drifts.
 *
 * Review finding [120] is the second time a file this change owns was left off it. The first was a
 * newly added suite; the second was `workflowHygieneRequiredContext.test.ts`, SPLIT out of an
 * enumerated file when that file grew too slow to run in one worker. `pnpm check-types` reads only
 * this config for the test tree and Vitest does not type-check at runtime, so most of the
 * required-context guard could carry a type error and the required job would still be green.
 *
 * What these rows pin is narrow on purpose. A census of all 490 test files, split into checked and
 * unchecked, would make every addition a visible diff — but it is 426 lines of inventory that goes
 * stale on its own, and it is not what this change owns. The split case IS checkable without one: a
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
});
