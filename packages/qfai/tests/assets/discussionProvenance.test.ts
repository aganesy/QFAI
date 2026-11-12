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
    // QFAI:EX-0001-0017-01
    it(tree + ": SDD reads the record with the reviews and never edits the record", async () => {
      const skill = (await read(tree, "assistant/step/sdd-triage/STEP.md")).replace(/\s+/g, " ");
      const decomposition = await read(
        tree,
        "assistant/skill/qfai-sdd/references/requirements-decomposition.md",
      );
      expect(skill).toContain("Read every table of that record, the completed reviews");
      expect(skill).toContain("The record is history, not the current state");
      expect(skill).toContain("State a discrepancy in the SDD report or as an open question.");
      expect(skill).toContain("Never edit the record");
      expect(decomposition).toContain("Put an operation that is a critical decision to the user");
      expect(decomposition.replace(/\s+/g, " ")).toContain(
        "record the decision in `<paths.specsDir>/decisions.md` only when it passes the recording test",
      );
    });
  }
});
