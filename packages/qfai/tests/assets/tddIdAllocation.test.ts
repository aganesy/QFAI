import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("story-tree identifiers are allocated without reuse", () => {
  for (const tree of trees) {
    it(tree + ": scopes BF, US, AC, EX, BR, decisions, and questions", async () => {
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      for (const shape of [
        "BF-NNNN",
        "US-NNNN-NNNN",
        "AC-NNNN-NNNN-NN",
        "EX-NNNN-NNNN-NN",
        "BR-NNNN",
        "DEC-NNNN",
        "OQ-NNNN",
      ]) {
        expect(rules).toContain(shape);
      }
      expect(rules).toContain("Use highest existing number plus one in the scope");
      expect(rules).toContain("Count IDs named in retired-item decisions");
      expect(rules).toContain("Do not add a CLI allocator");
    });

    it(tree + ": moving a story rewrites dependent IDs and reserves retired ones", async () => {
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain(
        "Moving a story to another flow changes its US ID and every child AC and EX ID",
      );
      expect(rules).toContain("Record the old IDs as retired");
    });
  }
});
