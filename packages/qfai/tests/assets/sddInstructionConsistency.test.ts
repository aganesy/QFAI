import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("SDD instructions agree with flow evidence and UI routing", () => {
  for (const tree of trees) {
    it(tree + ": routes UI-bearing flows from source and linked UI contracts", async () => {
      const skill = (await read(tree, "assistant/step/sdd-triage/STEP.md")).replace(/\s+/g, " ");
      expect(skill).toContain("UI-bearing is a property of the affected flow");
      expect(skill).toContain(
        "source's surface classification and the UI contracts linked to that flow",
      );
      expect(skill).toContain("product-experience-architect");
      expect(skill).toContain("product-surface-reviewer");
    });
  }
});
