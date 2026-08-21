/**
 * `qfai-implement` Phase Red step 1 is the only statement of row selection, and
 * it carried four mutually exclusive rules in one undelimited paragraph. Three
 * were chained with `Otherwise`, so they read as a descending precedence; the
 * fourth — the one that outranks all of them — arrived last, introduced by
 * "wins over even that", whose antecedent was the *lowest*-precedence branch.
 * Read literally the sentence only claimed that a mutation-only request beats
 * the weakest rule.
 *
 * More than half the step was then the mutation-only sub-protocol, a read-only
 * procedure that selects a `done` row and is forbidden to move it — wedged into
 * a step whose stated job is to select the row to work.
 *
 * The precedence is now the list structure, and the sub-protocol lives in
 * `references/mutation-only-request.md`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped surface plus its generated root mirror. */
const SKILL_DIRS = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement",
  ".qfai/assistant/skills/qfai-implement",
];

const read = async (dir: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, dir, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\r?\n\s*/g, " ");

/** Phase Red step 1, from its own line up to step 2. */
const stepOne = (skill: string): string => {
  const lines = skill.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith("1. Read `test-list.md`"));
  expect(start, "Phase Red step 1 not found").toBeGreaterThan(-1);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("2. "));
  expect(end, "Phase Red step 2 not found").toBeGreaterThan(-1);
  return [lines[start], ...rest.slice(0, end)].join("\n");
};

describe("Phase Red row selection states its precedence as an order", () => {
  for (const dir of SKILL_DIRS) {
    it(`${dir}: the four branches are an ordered list, highest first`, async () => {
      const step = stepOne(await read(dir, "SKILL.md"));

      // The step must be a list, not one paragraph: the order is the rule.
      const items = step.split(/\r?\n/).filter((line) => /^\s+\d+\. /.test(line));
      expect(items).toHaveLength(4);

      expect(items[0]).toContain("**A mutation-only request wins over all three below");
      expect(items[1]).toContain("**A named row wins**");
      expect(items[2]).toContain("**rework first**: if any row is at `review-fix`");
      expect(items[3]).toContain("first row with `Status = todo`");
    });

    it(`${dir}: the winning branch no longer back-references the weakest one`, async () => {
      const step = stepOne(await read(dir, "SKILL.md"));

      // "wins over even that" resolved to the `todo` clause immediately before
      // it — the lowest branch — which made the claim vacuous.
      expect(step).not.toContain("wins over even that");
    });

    it(`${dir}: the read-only sub-protocol is cited, not inlined in the step`, async () => {
      const skill = await read(dir, "SKILL.md");
      const step = stepOne(skill);

      expect(step).toContain("`references/mutation-only-request.md`");
      // The execution sequence and the request's field list belong to the
      // reference; step 1 keeps only the selection rule.
      expect(step).not.toContain("re-run for the restored GREEN");
      expect(step).not.toContain("the selector to run under the changed artifact");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    });

    it(`${dir}: the reference carries the inputs, the sequence and the no-write rule`, async () => {
      const reference = flat(await read(dir, "references/mutation-only-request.md"));

      expect(reference).toContain("`../qfai-atdd/references/shared-test-artifacts.md`");
      expect(reference).toContain("the selector to run under the changed artifact");
      expect(reference).toContain("**Revert in the same step**");
      expect(reference).toContain("Re-run for the restored GREEN");
      expect(reference).toContain(
        "**Write nothing to `test-list.md` and nothing to that row's evidence.**",
      );
      expect(reference).toContain("`## Shared-artifact re-verify`");
    });
  }
});
