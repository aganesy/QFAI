import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("SDD writes the selected story tree", () => {
  for (const tree of trees) {
    it(tree + ": keeps the three story files and two decision registers", async () => {
      const skill = await read(tree, "assistant/step/sdd-story/STEP.md");
      const triage = await read(tree, "assistant/step/sdd-triage/STEP.md");
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      for (const file of ["01_User-story.md", "02_Acceptance-Criteria.md", "03_Example.md"]) {
        expect(skill).toContain(file);
        expect(rules).toContain(file);
      }
      expect(triage).toContain("decisions.md");
      expect(triage).toContain("open-questions.md");
      expect(skill).not.toContain("16_Traceability-ledger.md");
    });
  }
});
