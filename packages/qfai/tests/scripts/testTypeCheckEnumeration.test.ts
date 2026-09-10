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
 * The tree is now split in two and both halves are stated: what `include` covers, and what
 * `typeCheckEnumeration.allowlist.ts` records as knowingly uncovered. A suite in neither is one
 * somebody forgot, and that is the case this file could not see before — an omission read exactly
 * like a file that does not exist.
 *
 * The uncovered list is a ratchet rather than an inventory. It is compared in both directions, so a
 * line whose file is covered or gone fails as loudly as a missing one, and it can only shrink. That
 * is the difference from a census: a census goes stale silently, which is the failure this whole
 * file exists to report.
 *
 * The narrower rows below stay. They name a suite that must be covered rather than merely accounted
 * for, so they keep failing even while its line sits in the uncovered list.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TYPE_CHECK_UNENUMERATED } from "./typeCheckEnumeration.allowlist.js";

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

const ALLOWLIST_REL = "tests/scripts/typeCheckEnumeration.allowlist.ts";

/** Every `*.test.ts` under `tests/`, as the paths the config's entries are written in. */
function suitesInTree(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(path.join(PACKAGE_ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(rel);
      } else if (entry.name.endsWith(".test.ts")) {
        found.push(rel);
      }
    }
  };
  walk("tests");
  return found.sort();
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
        "that polices the 500-line ceiling came to carry a TS2345 of its own",
    ).toEqual([]);
  });

  it("accounts for every suite in the tree, as covered or as knowingly uncovered", () => {
    // The case the rows above cannot see: a suite that is simply absent from
    // both. Vitest does not type-check at run time, so such a file is typed by
    // nothing and every required job stays green over a type error in it.
    const enumerated = new Set(enumeratedTests());
    const accounted = new Set([...enumerated, ...TYPE_CHECK_UNENUMERATED]);

    expect(
      suitesInTree().filter((rel) => !accounted.has(rel)),
      `${CONFIG_REL} does not name these suites and ${ALLOWLIST_REL} does not record them as ` +
        "uncovered, so nothing type-checks them and nothing says so. Add the line to the config, " +
        "or the path to the list with the rest of the backlog",
    ).toEqual([]);
  });

  it("keeps the uncovered list to files that are still uncovered", () => {
    // The direction that makes the list shrink. An entry whose suite has since
    // been enumerated, renamed or deleted reads as a standing exemption and
    // holds a slot a new omission could take.
    const enumerated = new Set(enumeratedTests());
    const present = new Set(suitesInTree());

    const stale = TYPE_CHECK_UNENUMERATED.filter((rel) => enumerated.has(rel) || !present.has(rel));

    expect(
      stale.sort(),
      `${ALLOWLIST_REL} records these as uncovered, and each is now covered or gone. Strike them ` +
        "in the change that covered them — the list may only shrink",
    ).toEqual([]);
  });
});
