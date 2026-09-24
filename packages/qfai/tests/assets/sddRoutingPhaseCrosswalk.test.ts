import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("SDD routing crosswalk covers the ordered story-tree stages", () => {
  for (const tree of trees) {
    it(tree + ": maps each routing phase to a blocking decision", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const crosswalk = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-routing-phase-crosswalk.md",
      );
      expect(skill).toContain("references/sdd-routing-phase-crosswalk.md");
      for (const phase of ["slice-and-scope", "design", "review"]) {
        expect(crosswalk).toContain("| `" + phase + "`");
      }
      expect(crosswalk).toContain("Stage 0 source and preflight; Stage 1 triage and records");
      expect(crosswalk).toContain(
        "Stage 2 policy and flows; Stage 3 stories and examples; Stage 4 contracts and rules",
      );
      expect(crosswalk).toContain("BF → US → AC → EX ← BR");
      expect(crosswalk).toContain("completion-reviewer");
    });

    it(tree + ": contract reruns retain per-flow review and gate", async () => {
      const crosswalk = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-routing-phase-crosswalk.md",
      );
      expect(crosswalk).toContain("Record the review and gate in each affected BF's evidence");
      expect(crosswalk).toContain("A REVISE returns to the author");
    });
  }
});
