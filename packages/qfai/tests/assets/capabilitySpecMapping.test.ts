import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("business-flow and story indexes locate the canonical tree", () => {
  for (const tree of trees) {
    it(tree + ": the flow index uses BF IDs and paths", async () => {
      const index = await read(
        tree,
        "assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flows.md",
      );
      expect(index).toContain("| BF-ID | Flow | Path |");
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("business-flows.md cites each actual BF");
    });

    it(tree + ": the story index maps US IDs to directories within a flow", async () => {
      const index = await read(
        tree,
        "assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN/user-stories.md",
      );
      expect(index).toContain("US-0001-0001");
      expect(index).toContain("user-story-0001-0001/");
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("user-stories.md cites each US under that flow");
    });
  }
});
