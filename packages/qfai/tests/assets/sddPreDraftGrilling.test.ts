import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("qfai-sdd pre-draft grilling", () => {
  for (const tree of trees) {
    it(`${tree}: requires a checkpoint before each design-writing stage`, async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const loop = await read(
        tree,
        "assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md",
      );
      const gate = await read(tree, "assistant/skill/qfai-sdd/references/sdd-quality-gate.md");
      const evidence = await read(tree, "assistant/skill/qfai-sdd/templates/evidence/sdd-flow.md");
      for (const stage of [
        "Triage and records",
        "Policy and flows",
        "Stories and examples",
        "Contracts and rules",
      ]) {
        expect(loop).toContain(stage);
      }
      expect(loop).toContain("before this invocation's first design mutation");
      expect(skill).toContain("A skipped checkpoint fails the gate");
      expect(gate).toContain("A skipped checkpoint fails the gate");
      expect(evidence).toContain("## Pre-draft Grilling");
      expect(evidence).toContain("before its first story-tree");
    });
  }
});
