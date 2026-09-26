import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("qfai-sdd parallel work isolation", () => {
  for (const tree of trees) {
    it(`${tree}: scopes flow workers and coordinates shared writes`, async () => {
      const playbook = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-execution-playbook.md",
      );
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      expect(playbook).toContain("## Parallel work");
      expect(skill).toContain(
        "A worker's flow gate does not include a sibling flow still being edited",
      );
      expect(skill).toContain("shared dependencies");
    });
  }
});
