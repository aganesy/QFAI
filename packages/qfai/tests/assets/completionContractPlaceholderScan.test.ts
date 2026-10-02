import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("completion placeholder scan respects recorded unknowns", () => {
  for (const tree of trees) {
    it(tree + ": scans unfinished tokens but preserves documented TBD", async () => {
      const baseline = await read(tree, "assistant/rule/shared-skill-operating-baseline.md");
      const scan = baseline
        .split(/\r?\n/)
        .find((line) => line.startsWith("- scan generated artifacts"));
      expect(scan).toBeDefined();
      for (const token of ["TODO", "TBA", "TBC", "PLACEHOLDER"]) {
        expect(scan).toContain(token);
      }
      expect(scan).toContain("**undocumented** `TBD`");
      expect(baseline).toContain("A documented `TBD` is a compliant record");
      expect(baseline).toContain("A hit is **reported, not silently cleared**");
    });

    it(tree + ": uses the current open-question register shape", async () => {
      const questions = await read(
        tree,
        "assistant/skill/qfai-sdd/templates/spec/open-questions.md",
      );
      expect(questions).toContain("| ID  | Content | Approach | Status |");
      expect(questions).not.toContain("Due");
    });
  }
});
