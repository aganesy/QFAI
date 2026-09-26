import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("qfai-sdd UI contract guide is reachable", () => {
  for (const tree of trees) {
    it(`${tree}: reads the guide for UI work and gates the design lock`, async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const guide = await read(tree, "assistant/skill/qfai-sdd/references/ui-contract-guide.md");
      expect(skill).toContain("For UI work also read `references/ui-contract-guide.md`");
      expect(skill).toContain("before finalizing design contracts");
      expect(guide).toContain("## Design lock");
      expect(guide).toContain("## Screen contract rules");
    });
  }
});
