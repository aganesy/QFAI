import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("optional discussion prototyping recommendation", () => {
  for (const tree of trees) {
    it(`${tree}: SDD reads the selected pack without requiring a recommendation artifact`, async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const playbook = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-execution-playbook.md",
      );
      const discussion = await read(tree, "assistant/skill/qfai-discussion/SKILL.md");
      expect(skill).toContain("selectedInputPath");
      expect(playbook).toContain("Respect an explicitly selected discussion pack");
      expect(playbook).not.toContain("missing valid `prototyping.yaml`");
      expect(discussion).toContain("prototyping.yaml");
    });
  }
});
