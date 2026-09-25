import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("SDD decision and question homes", () => {
  for (const tree of trees) {
    it(`${tree}: records adopted, rejected, and unresolved grilling outcomes in story-tree rows`, async () => {
      const loop = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md",
      );
      const triage = await read(tree, "assistant/skill/qfai-sdd/references/sdd-triage.md");
      expect(loop).toContain("appropriate `decisions.md` row");
      expect(loop).toContain("Record an unresolved choice in `open-questions.md`");
      expect(loop).toContain("REJECTED decision row");
      expect(triage).toContain("exactly ID, Content, Approach, Status");
    });
  }
});
