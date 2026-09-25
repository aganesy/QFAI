import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { LAYER_TAGS } from "../../src/core/testStrategyTags.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const RULE = "assistant/rule/test-layers.md";

const read = (tree: string): Promise<string> => readFile(path.join(repoRoot, tree, RULE), "utf-8");

describe("story-tree test layer rule", () => {
  for (const tree of TREES) {
    it(`${tree}: defines all five layers and their tags`, async () => {
      const text = await read(tree);
      for (const [code, name, tag] of [
        ["L1", "Unit", "layer-unit"],
        ["L2", "Component", "layer-component"],
        ["L3", "Integration", "layer-integration"],
        ["L4", "API", "layer-api"],
        ["L5", "E2E", "layer-e2e"],
      ]) {
        expect(text).toContain(`### ${code} ${name}`);
        expect(text).toContain(`\`${tag}\``);
        expect(LAYER_TAGS.has(tag)).toBe(true);
      }
    });

    it(`${tree}: routes BF, AC, and EX annotations by layer`, async () => {
      const text = await read(tree);
      expect(text).toMatch(/`QFAI:BF-NNNN`\s*\|\s*E2E/);
      expect(text).toMatch(/`QFAI:AC-NNNN-NNNN-NN`\s*\|\s*Integration or API/);
      expect(text).toMatch(/`QFAI:EX-NNNN-NNNN-NN`\s*\|\s*Selected non-E2E test file/);
      expect(text).toContain("AC and EX annotations do not belong in E2E tests");
      expect(text).toContain("`validation.traceability.testFileGlobs`");
      expect(text).not.toContain("test-list.md");
      expect(text).not.toContain("TC-*");
    });

    it(`${tree}: requires behavioral evidence and a complete scan`, async () => {
      const text = await read(tree);
      expect(text).toContain("An annotation-only file");
      expect(text).toContain("An unreadable or truncated test scan cannot certify absence");
      expect(text).toContain("A missing lane or an unrun command is UNRUN, not PASS");
    });
  }
});
