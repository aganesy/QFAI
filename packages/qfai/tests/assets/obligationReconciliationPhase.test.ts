import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("contract obligations are reconciled after concrete examples", () => {
  for (const tree of trees) {
    it(tree + ": checks realizability and cross-contract outcomes", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const rules = await read(
        tree,
        "assistant/skill/qfai-sdd/references/contract-artifact-rules.md",
      );
      const gate = await read(tree, "assistant/skill/qfai-sdd/references/sdd-quality-gate.md");
      expect(skill).toContain("Write a BR only after the EX it cites exists");
      expect(rules).toContain(
        "For each affected AC, EX, and BR, name the contract that realizes it",
      );
      expect(rules).toContain(
        "Resolve every persisted attribute to a concrete field, column, or enum member",
      );
      expect(rules).toContain("state the join that reaches it");
      expect(gate).toContain(
        "Paired API and DB contracts agree on terminal states and error outcomes",
      );
    });

    it(
      tree + ": contract reruns close over changed dependencies without widening writes",
      async () => {
        const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
        const rules = await read(
          tree,
          "assistant/skill/qfai-sdd/references/contract-artifact-rules.md",
        );
        expect(skill).toContain("Recompute affected flows after each contract change");
        expect(rules).toContain(
          "recheck every obligation in it until a pass writes nothing and adds no flow",
        );
        expect(rules).toContain("write scope stays within the approved change-request row");
        expect(rules).toContain("A confirm-only review is read-only");
      },
    );
  }
});
