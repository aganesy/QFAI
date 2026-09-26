import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("SDD import-lite provenance", () => {
  for (const tree of trees) {
    it(`${tree}: creates stamped evidence only when an import source exists`, async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const playbook = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-execution-playbook.md",
      );
      const template = await read(
        tree,
        "assistant/skill/qfai-sdd/templates/evidence/import-lite.md",
      );
      expect(skill).toContain("import-lite evidence route");
      expect(playbook).toContain(".qfai/evidence/import-lite-<ts>.md");
      expect(playbook).toContain("Do not manufacture a discussion pack");
      expect(template).toContain("entrypoint: import-lite");
      expect(template).toContain("exclusive create");
      expect(template).toContain("## Sources");
      expect(template).toContain("import-lite-<ts>#IMP-001");
      expect(template).toContain("before editing the story tree");
    });
  }
});
