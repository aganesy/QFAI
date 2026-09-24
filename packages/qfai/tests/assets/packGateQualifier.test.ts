import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");
const flat = (text: string): string => text.replace(/\s+/g, " ");

describe("packaging verification is conditional on distribution", () => {
  for (const tree of TREES) {
    it(tree + ": ATDD completion is scoped to the active flow", async () => {
      const atdd = flat(await read(tree, "assistant/skill/qfai-atdd/SKILL.md"));
      expect(atdd).toContain("The stage may report PASS only when");
      expect(atdd).toContain(
        "Every BF and AC obligation in scope has an executed, behavior-checking test",
      );
      expect(atdd).toContain("Routed reviewers and qa-gatekeeper passed the current work");
      expect(atdd).toContain("`/qfai-verify` runs the repository gate");
      expect(atdd).not.toMatch(/pack\/verify.*pass with evidence/);
    });

    it(tree + ": the repository gate retains the distribution qualifier", async () => {
      const [constitution, workflow, quality, verify] = await Promise.all([
        read(tree, "assistant/rule/constitution.md"),
        read(tree, "assistant/rule/workflow.md"),
        read(tree, "assistant/rule/quality.md"),
        read(tree, "assistant/skill/qfai-verify/SKILL.md"),
      ]);
      expect(flat(constitution)).toContain("packaging verification (if distributed)");
      expect(flat(workflow)).toContain("pack/verify (if distributed)");
      expect(flat(quality)).toContain(
        "pack / distribution verification (when publishing or distribution matters)",
      );
      expect(flat(verify)).toContain("pack/verify (if distributed)");
    });
  }
});
