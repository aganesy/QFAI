import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("the story-tree contract owns quality-gate commands", () => {
  for (const tree of TREES) {
    it(`${tree}: configure and verify name the same Standard commands home`, async () => {
      const configure = await read(tree, "assistant/skill/qfai-configure/SKILL.md");
      const verify = await read(tree, "assistant/skill/qfai-verify/SKILL.md");
      const quality = await read(tree, "assistant/rule/quality.md");
      expect(configure).toContain("03_contract/tech.md#standard-commands-copy-paste");
      expect(verify).toContain(".qfai/spec/03_contract/tech.md#standard-commands-copy-paste");
      expect(quality).toContain("<paths.specsDir>/03_contract/tech.md");
      for (const content of [configure, verify, quality]) {
        expect(content).not.toContain(".qfai/assistant/catalog/tech.md");
      }
    });

    it(`${tree}: structure does not duplicate Standard commands`, async () => {
      const structure = await read(tree, "spec/03_contract/structure.md");
      const tech = await read(tree, "spec/03_contract/tech.md");
      expect(tech).toContain("## Standard commands (copy-paste)");
      expect(structure).not.toContain("## Standard commands (copy-paste)");
    });
  }
});
