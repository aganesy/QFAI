import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = async (tree: string, relative: string): Promise<string> =>
  (await readFile(path.join(ROOT, tree, relative), "utf-8")).replace(/\s+/g, " ");

describe("answered review demands are carried into the next existing request", () => {
  for (const tree of TREES) {
    it(`${tree}: the common rule bounds demands, not reports`, async () => {
      const text = await read(tree, "assistant/constitution/review-convergence.md");
      for (const clause of [
        "### Answered demands (MUST)",
        "MUST NOT be re-raised under another wording",
        "Close a repeat by citing its recorded answer",
        "what a reviewer may require, not what a reviewer may report",
        "Carry prior answers forward",
        "before dispatching reviewers",
        "a new defect or evidence that an answer no longer applies",
        "the authoritative reviewer accepts the fix or a reasoned decline",
        "or the user adjudicates it",
        "A producer's reply alone does not close a demand",
        "An unresolved blocking demand remains REVISE when repeated",
      ]) {
        expect(text.includes(clause), clause).toBe(true);
      }
      expect(text).toContain("Severity overrides lateness");
    });

    it.each([
      "assistant/skills/qfai-discussion/templates/14_Review-Request.md",
      "assistant/skills/qfai-discussion/templates/review/review_request.md",
    ])(`${tree}: %s holds each demand beside its accepted answer`, async (relative) => {
      const text = await read(tree, relative);
      expect(text).toContain("## Answered demands");
      for (const column of ["Finding source", "Demand", "Response", "Evidence"]) {
        expect(text.includes(column), column).toBe(true);
      }
      expect(text).toContain("review-convergence.md#answered-demands-must");
      expect(text).toContain("write `None`");
      expect(text).toContain("reviewer acceptance or user adjudication");
      expect(
        text.includes("Blocking feedback triggers immediate return"),
        "blocking-only return",
      ).toBe(true);
      expect(text).not.toContain("Any feedback triggers immediate return");
    });

    it(`${tree}: the reviewer classifies feedback before required fixes gate the cycle`, async () => {
      const text = await read(
        tree,
        "assistant/skills/qfai-discussion/templates/review/Rxx_reviewer.md",
      );
      expect(text).toContain("Severity: blocking|advisory");
      expect(text).toContain("Traces to:");
      expect(text).toContain("## Required Fixes");
      expect(text).toContain("Unresolved blocking findings require REVISE");
      expect(text).toContain("Advisory reports alone do not require rework");
    });

    it.each(["qfai-discussion", "qfai-sdd"])(
      `${tree}: %s carries answers before reviewer dispatch`,
      async (skill) => {
        const text = await read(
          tree,
          `assistant/skills/${skill}/references/review-cycle-playbook.md`,
        );
        expect(text).toContain("review-convergence.md#answered-demands-must");
        expect(text).toContain("Carry prior answers and newly answered demands");
        expect(text).toContain("next cycle's `review_request.md` before dispatching reviewers");
      },
    );
  }
});
