import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("discussion IDs remain provenance, not story-tree IDs", () => {
  for (const tree of trees) {
    it(tree + ": SDD records selected source and disposition in its own records", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const decomposition = await read(
        tree,
        "assistant/skill/qfai-sdd/references/requirements-decomposition.md",
      );
      expect(skill).toContain("discussion-<id>#REQ-NNNN");
      expect(skill.replace(/\s+/g, " ")).toContain(
        "provenance and design input, not a normative SSOT",
      );
      expect(skill).toContain("do not edit the");
      expect(decomposition).toContain("Record a create, update, or retirement operation in");
      expect(decomposition).toContain("decisions.md");
    });

    it(tree + ": workshop IDs cannot be mistaken for assigned US and AC IDs", async () => {
      const workshop = await read(
        tree,
        "assistant/skill/qfai-discussion/templates/03_Story-Workshop.md",
      );
      expect(workshop).toContain("DUS-");
      expect(workshop).toContain("DAC-");
      expect(workshop).toContain("US-0001-0001");
      expect(workshop).toContain("decisions.md");
    });
  }
});
