import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("qfai-sdd approval in no-question mode", () => {
  for (const tree of trees) {
    it(`${tree}: leaves approval-required decisions pending before dependent writes`, async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const triage = await read(tree, "assistant/skill/qfai-sdd/references/sdd-triage.md");
      expect(skill).toContain("--auto");
      expect(skill).toContain("sdd-triage.md");
      expect(skill).toContain("consultation-needed");
      expect(triage).toContain("Do not self-approve");
      expect(triage).toContain("leave approval-required rows at TODO");
      expect(triage).toContain("stop before their dependent writes");
      expect(triage).toContain(
        "Approval-free changes may proceed only if they do not depend on a pending row",
      );
    });
  }
});
