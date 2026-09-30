import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("story-tree decision records replace the per-spec delta", () => {
  for (const tree of trees) {
    it(tree + ": ships a four-column append-only decision template", async () => {
      const template = await read(tree, "assistant/skill/qfai-sdd/templates/spec/decisions.md");
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(template).toContain("| ID  | Content | Approach | Status |");
      expect(rules).toContain("only Status changes after append");
      expect(rules).toContain("Change request:");
      expect(rules).toContain("REJECTED");
    });

    it(tree + ": keeps questions in a separate four-column register", async () => {
      const template = await read(
        tree,
        "assistant/skill/qfai-sdd/templates/spec/open-questions.md",
      );
      expect(template).toContain("| ID  | Content | Approach | Status |");
      expect(template).not.toContain("Owner | Due");
    });
  }
});
