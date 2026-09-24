import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, skill: string): Promise<string> =>
  readFile(path.join(root, tree, "assistant/skill", skill, "SKILL.md"), "utf-8");

describe("skills read the governing inputs for their current stage", () => {
  for (const tree of trees) {
    it(tree + ": discussion and prototyping read the rule and project context trees", async () => {
      for (const skillId of ["qfai-discussion", "qfai-prototyping"]) {
        const skill = await read(tree, skillId);
        expect(skill).toContain("## Inputs Priority");
        expect(skill).toContain(".qfai/assistant/rule/*");
        expect(skill).not.toContain(".qfai/assistant/constitution/*");
      }
      expect(await read(tree, "qfai-discussion")).toContain(".qfai/assistant/catalog/");
      expect(await read(tree, "qfai-prototyping")).toContain("project context in the story tree");
    });

    it(tree + ": SDD reads the selected source and existing story tree", async () => {
      const skill = await read(tree, "qfai-sdd");
      expect(skill).toContain("selectedInputPath");
      expect(skill).toContain("existing story tree");
      expect(skill).toContain("shared-skill-operating-baseline.md");
      expect(skill).toContain("decisions.md");
    });

    it(
      tree + ": acceptance and implementation skills read flow obligations and layer rules",
      async () => {
        const atdd = await read(tree, "qfai-atdd");
        const implement = await read(tree, "qfai-implement");
        for (const skill of [atdd, implement]) {
          expect(skill).toContain("BF-NNNN");
          expect(skill).toContain("paths.specsDir");
          expect(skill).toContain("rule/test-layers.md");
        }
        expect(atdd).toContain("owning contracts");
        expect(implement).toContain("paths.contractsDir");
      },
    );
  }
});
