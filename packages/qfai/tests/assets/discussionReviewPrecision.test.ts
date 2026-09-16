import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-discussion";
const read = async (tree: string, relative: string): Promise<string> =>
  (await readFile(path.join(ROOT, tree, relative), "utf-8")).replace(/\s+/g, " ");

describe("discussion review checks read facts and planning decisions with targeted fixes", () => {
  for (const tree of TREES) {
    it(`${tree}: repository claims name verified lookup evidence`, async () => {
      const skill = await read(tree, `${SKILL}/SKILL.md`);
      expect(skill.includes("each repository fact the pack states names where it was read")).toBe(
        true,
      );
      expect(skill.includes("verify the claim rather than treating a citation as proof")).toBe(
        true,
      );
      const source = await read(tree, `${SKILL}/templates/04_Sources.md`);
      expect(source).toContain("qfai-discussion/SKILL.md#reviewer-gate-must");
      const request = await read(tree, `${SKILL}/templates/review/review_request.md`);
      expect(request).toContain("qfai-discussion/SKILL.md#reviewer-gate-must");
    });

    it(`${tree}: Stage 0 reads every completed review of the pack it selected`, async () => {
      const playbook = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-execution-playbook.md",
      );
      // The pack is the one the preflight selected, compared as resolved paths.
      expect(playbook).toContain("the preflight result's `selectedInputPath`");
      expect(playbook).toContain("**Compare the two as resolved paths.**");
      // Completed reviews only, and every one of them.
      expect(playbook).toContain(
        "A directory with no `summary.json` is skipped whatever its stamp",
      );
      expect(playbook).toContain(
        "**Read every completed review of the pack, newest first, not only the newest one.**",
      );
      expect(playbook).toContain("Carry forward each one no later review answers");
      // Including the ones the archive holds.
      expect(playbook).toContain("Look in `.qfai/review/_archive/review-*/`");
      // And the verdicts are read against what the pack looked like then.
      expect(playbook).toContain("git diff --name-only <rev> -- <pack path>");
      expect(playbook).toContain("One revision, not two.");
      // Every item taken gets a disposition in an SDD-owned artifact.
      expect(playbook).toContain("Silence is not a disposition");
    });

    it(`${tree}: implementation detail is advice, but wrong pack facts remain in remit`, async () => {
      const rule = await read(tree, "assistant/constitution/review-convergence.md");
      for (const clause of [
        "A discussion review judges what the planning stage decides, not implementation precision",
        "Exact code-line edits, generated-copy updates and merge mechanics",
        "reported as advice, not demanded as extra discussion completion work",
        "Wrong repository facts, missing decision traceability",
        "remain in remit",
        "Non-normative status is not permission to pass those",
      ]) {
        expect(rule.includes(clause), clause).toBe(true);
      }
      const request = await read(tree, `${SKILL}/templates/review/review_request.md`);
      expect(request).toContain("review-convergence.md#discussion-review-precision");
    });

    it(`${tree}: fixes preserve unaffected content and the existing round budget`, async () => {
      const playbook = await read(tree, `${SKILL}/references/review-cycle-playbook.md`);
      expect(playbook.includes("Fix the finding with the smallest edit that resolves it")).toBe(
        true,
      );
      expect(playbook.includes("leave unaffected content alone")).toBe(true);
      const rule = await read(tree, "assistant/constitution/review-convergence.md");
      expect(rule).toContain("Two rounds per reviewer per artifact");
      expect(rule).toContain("One 2b per artifact, total");
      expect(rule).toContain("REVISE` is terminal");
    });
  }
});
