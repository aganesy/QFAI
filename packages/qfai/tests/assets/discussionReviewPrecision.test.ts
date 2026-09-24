import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("SDD selected-source review precision", () => {
  for (const tree of trees) {
    it(`${tree}: reads completed reviews for the selected pack`, async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const playbook = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-execution-playbook.md",
      );
      expect(skill).toContain("selectedInputPath");
      expect(skill).toContain("completed reviews");
      expect(playbook).toContain("summary.json exists");
      expect(playbook).toContain("Match the resolved pack path");
      expect(playbook).toContain("include archived reviews");
      expect(playbook).toContain(
        "Do not treat an incomparable review as a current binding verdict",
      );
    });
  }
});
