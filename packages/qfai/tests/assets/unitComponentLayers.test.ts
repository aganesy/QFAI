import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LAYER_TAGS } from "../../src/core/testStrategyTags.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const CATALOG = "assistant/catalog/test-layers.md";

/** Returns the `## Layer definitions` body. */
function layerDefinitions(content: string): string {
  const start = content.indexOf("## Layer definitions");
  const rest = content.slice(start + 1);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("the layer SSOT defines every layer the rest of qfai names", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: L1 Unit and L2 Component have the same shape as L3-L5`, async () => {
      const section = layerDefinitions(await read(tree, CATALOG));
      for (const heading of ["### L1 Unit", "### L2 Component"]) {
        expect(section).toContain(heading);
      }
      // Each layer block carries Scope / Goal / Location rule.
      const blocks = section.split(/### L\d /).slice(1);
      expect(blocks).toHaveLength(5);
      for (const block of blocks) {
        expect(block).toContain("- Scope:");
        expect(block).toContain("- Goal:");
        expect(block).toContain("- Location rule:");
      }
    });

    it(`${tree}: every LAYER_TAGS entry has a definition`, async () => {
      const section = layerDefinitions(await read(tree, CATALOG)).toLowerCase();
      for (const tag of LAYER_TAGS) {
        expect(section).toContain(tag.replace("layer-", "").replace("e2e", "e2e"));
      }
    });

    it(`${tree}: TestKind resolution knows the two new directories`, async () => {
      const catalog = await read(tree, CATALOG);
      expect(catalog).toContain("- `tests/unit/**` -> Unit");
      expect(catalog).toContain("- `tests/component/**` -> Component");
    });

    it(`${tree}: the per-level routing is published as an unenforced target state`, async () => {
      const catalog = await read(tree, CATALOG);
      // The routing must be documented, but flagged as not-yet-enforced: the
      // scanner globs only tests/{e2e,api,integration}, so following it today
      // makes QFAI-ATDD-112 report the TC as uncovered.
      expect(catalog).toContain("target state — **not enforced, do not follow yet**");
      expect(catalog).toContain("L1 -> `tests/unit/**`, L2 -> `tests/component/**`");
      expect(catalog).toContain("buildAtddTestGlobs");
      expect(catalog).toContain("keep discharging every `TC-*` in `tests/integration/**`");
    });

    it(`${tree}: an L4 obligation is discharged as CON-API, never as TC`, async () => {
      const catalog = await read(tree, CATALOG);
      expect(catalog).toContain("`QFAI-ATDD-121` / `QFAI-ATDD-122`");
      expect(catalog).toContain("never as a `TC-*` one");
    });

    it(`${tree}: the coverage metric is separated from the file location`, async () => {
      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("it says nothing about where the test file lives");
      expect(rules).toContain("still discharged in `tests/integration/**`");
    });
  }
});
