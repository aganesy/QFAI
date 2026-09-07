/**
 * The prototyping scope floor has exactly one home (#785).
 *
 * Article VII grants a documented Change Request the right to shrink
 * `/qfai-prototyping` below ALL specs. `workflow.md` used to restate the same
 * rule as "scope is fixed to **ALL specs**" — unconditional, with no exception
 * and no pointer back. Two non-negotiable files, opposite answers to the same
 * request, and nothing in the directory to break the tie. The restatement is
 * now a citation, so the rule cannot drift again.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CONSTITUTION = "assistant/constitution/constitution.md";
const WORKFLOW = "assistant/constitution/workflow.md";

const SCOPE_FLOOR_HEADING = "### Prototyping exception (scope floor)";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("the prototyping scope floor lives in Article VII only", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: constitution.md keeps the floor and its Change Request exception`, async () => {
      const constitution = await read(tree, CONSTITUTION);

      expect(constitution).toContain(SCOPE_FLOOR_HEADING);
      expect(flat(constitution)).toContain(
        "the minimum allowed scope is **ALL specs** in `.qfai/specs/spec-*`",
      );
      expect(flat(constitution)).toContain(
        "prohibited unless explicitly approved as a documented Change Request",
      );
    });

    it(`${tree}: workflow.md cites the article instead of restating the floor`, async () => {
      const workflow = flat(await read(tree, WORKFLOW));

      expect(workflow).toContain(
        "`/qfai-prototyping` scope is governed by Article VII § Prototyping exception (scope floor) in `.qfai/assistant/constitution/constitution.md`",
      );
      // A citation with no precedence rule still leaves a stage-4 agent guessing
      // which non-negotiable file wins when they overlap.
      expect(workflow).toContain(
        "on any overlap between this file and the constitution, the constitution wins",
      );
    });

    it(`${tree}: workflow.md carries no second copy of the floor to drift`, async () => {
      const workflow = await read(tree, WORKFLOW);

      // The exact wording that made the two files disagree.
      expect(workflow).not.toMatch(/scope is fixed to/);
      // Any restatement of the floor's substance is a second home by definition.
      expect(workflow).not.toMatch(/ALL specs/);
    });

    it(`${tree}: the cited heading exists verbatim in constitution.md`, async () => {
      const [constitution, workflow] = await Promise.all([
        read(tree, CONSTITUTION),
        read(tree, WORKFLOW),
      ]);

      const cited = /Article VII § (Prototyping exception \(scope floor\))/.exec(flat(workflow));
      expect(cited).not.toBeNull();
      expect(constitution).toContain(`### ${cited?.[1] ?? ""}`);
    });
  }
});
