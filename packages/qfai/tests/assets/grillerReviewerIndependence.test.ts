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
      expect(loop).toContain(
        "Keep grilling and the final review apart: the reviewer reviews no decision it recommended",
      );
      expect(loop).toContain("settles them in a delegated grilling session");
      expect(loop).toContain("A critical product decision goes to the user");
      expect(skill).toContain("run one review with `common-review-cycle`");
      // Independence is the shared reviewer gate's, which every skill inherits.
      const baseline = await read(tree, "assistant/rule/shared-skill-delegation-baseline.md");
      expect(baseline).toContain("It must not return `PASS` on an artifact it authored.");
      expect(gate).toContain("Reviewers are independent of authors");
    });
  }
});
