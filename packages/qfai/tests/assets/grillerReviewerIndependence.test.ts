import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("SDD griller and reviewer independence", () => {
  for (const tree of trees) {
    it(`${tree}: separates authorship, grilling, and final review`, async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const loop = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md",
      );
      const gate = await read(tree, "assistant/skill/qfai-sdd/references/sdd-quality-gate.md");
      expect(loop).toContain("Keep authorship, grilling, and final review as distinct invocations");
      expect(loop).toContain("a critical product decision needs the user");
      expect(skill).toContain("an author cannot review the artifact it edited");
      expect(gate).toContain("Reviewers are independent of authors");
    });
  }
});
