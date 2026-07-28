import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe('"relevant test suite" is defined and bounded', () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the Refactor step defines the selector and its fallback`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("smallest selector that covers the module you touched");
      expect(skill).toContain("declared\n   dependents");
      expect(skill).toContain("the package containing\n      the touched module");
      expect(skill).not.toContain("Run the full relevant test suite");
    });

    it(`${tree}: the wide run has a stated cadence, not a per-item cost`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("narrow suite per item, full suite at each checkpoint");
      expect(skill).toContain("quadratic in ledger size");
      // Item 11 of the 11-point gate is where the full suite is paid for.
      expect(skill).toMatch(/11\. Checkpoint verification passed — this is where the \*\*full\*\* suite runs/);
    });

    it(`${tree}: test-layers.md bounds test-file granularity`, async () => {
      const layers = await read(tree, "assistant/catalog/test-layers.md");
      expect(layers).toContain("## Test-file granularity");
      expect(layers).toContain("one test module per `TC-*`");
      expect(layers).toContain("is an anti-pattern");
      // The permissive trace rule must no longer read as licence to aggregate.
      expect(layers).toContain("this is a trace rule, not");
    });
  }
});
