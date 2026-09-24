import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("observed failures become concrete examples under acceptance criteria", () => {
  for (const tree of trees) {
    it(tree + ": keeps failures and boundaries in AC and EX coverage", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const checklist = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-phase-checklists.md",
      );
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(skill).toContain("Preserve normal outcomes and meaningful failure boundaries");
      expect(checklist).toContain(
        "Examples cover meaningful success, boundary, and kept-failure outcomes",
      );
      expect(rules).toContain("Every AC has at least one EX");
    });

    it(tree + ": each example points to exactly one acceptance criterion", async () => {
      const template = await read(
        tree,
        "assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/03_Example.md",
      );
      expect(template).toContain("| EX-ID");
      expect(template).toContain("| AC-Ref");
      expect(template).toContain("EX-0001-0001-01");
      expect(template).toContain("AC-0001-0001-01");
    });
  }
});
