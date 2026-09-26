import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("SDD templates match the shipped story-tree layout", () => {
  for (const tree of trees) {
    it(tree + ": names the paired template root", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(skill).toContain("templates/spec/");
      expect(rules).toContain("../templates/spec/");
      expect(skill).not.toContain("templates/specs/");
    });

    it(tree + ": ships the story and contract index templates", async () => {
      for (const relative of [
        "templates/spec/02_business-flow/business-flow-NNNN/business-flow.md",
        "templates/spec/02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/01_User-story.md",
        "templates/spec/02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/02_Acceptance-Criteria.md",
        "templates/spec/02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/03_Example.md",
        "templates/spec/03_contract/contracts.md",
      ]) {
        expect((await read(tree, "assistant/skill/qfai-sdd/" + relative)).length).toBeGreaterThan(
          0,
        );
      }
    });
  }
});
