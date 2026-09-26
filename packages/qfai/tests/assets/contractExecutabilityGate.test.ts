import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe("qfai-sdd contract executability evidence", () => {
  for (const tree of trees) {
    it(`${tree}: requires an executable DB contract and flow evidence`, async () => {
      const gate = await read(tree, "assistant/skill/qfai-sdd/references/sdd-quality-gate.md");
      const evidence = await read(tree, "assistant/skill/qfai-sdd/templates/evidence/sdd-flow.md");
      expect(gate).toContain("applied to a scratch database");
      expect(gate).toContain("declared write paths were exercised");
      expect(gate).toContain("Contract executability");
      expect(evidence).toContain("## Contract executability");
      expect(evidence).toContain("## Validation");
      expect(evidence).toContain("--flow BF-NNNN");
    });
  }
});
