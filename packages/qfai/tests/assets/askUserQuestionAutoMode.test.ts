import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("--auto question and approval boundary", () => {
  for (const tree of trees) {
    it(`${tree}: shared protocol asks nothing and SDD does not self-approve`, async () => {
      const baseline = await read(tree, "assistant/rule/shared-skill-operating-baseline.md");
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const triage = await read(tree, "assistant/skill/qfai-sdd/references/sdd-triage.md");
      expect(baseline).toContain("When `--auto` is active, ask nothing");
      expect(skill).toContain("never supplies its own approval");
      expect(triage).toContain("In --auto, ask no question");
      expect(triage).toContain("stop before their dependent writes");
    });
  }
});
