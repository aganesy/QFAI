import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("SDD completion hands off story obligations without an execution ledger", () => {
  for (const tree of trees) {
    it(tree + ": gates and records each changed flow", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const gate = await read(tree, "assistant/skill/qfai-sdd/references/sdd-quality-gate.md");
      expect(skill).toContain("--flow BF-NNNN");
      expect(skill).toContain(".qfai/evidence/sdd-BF-NNNN.md");
      expect(gate).toContain("BF → US → AC → EX ← BR");
      expect(gate).toContain("Every EX has exactly one existing AC-Ref");
      expect(skill).not.toContain("tdd/test-list.md");
    });
  }
});
