import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LAYER_TAGS } from "../../src/core/testStrategyTags.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const CATALOG = "assistant/catalog/test-layers.md";

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

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
      // Each layer block carries Scope / Goal / where its tests live.
      const blocks = section.split(/### L\d /).slice(1);
      expect(blocks).toHaveLength(5);
      for (const block of blocks) {
        expect(block).toContain("- Scope:");
        expect(block).toContain("- Goal:");
      }
      // L1/L2 say "Convention" and L3-L5 say "Location rule", and the
      // difference is load-bearing: only the pinned three are scanned, and
      // calling `tests/unit/**` a rule is what made a project believe its
      // correctly-placed L1 annotation was owed to `tests/integration/**`.
      const [l1, l2, ...pinned] = blocks;
      for (const block of [l1, l2]) {
        expect(block).toContain("- Convention:");
        expect(block).not.toContain("- Location rule:");
      }
      for (const block of pinned) {
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

    it(`${tree}: Unit and Component are stated to owe no ATDD annotation`, async () => {
      const catalog = await read(tree, CATALOG);
      // The previous text told the reader to "keep discharging every TC-* in
      // tests/integration/**" until per-level routing went live. That made
      // QFAI-ATDD-112 — an `error`, and unwaivable under QFAI-WAIVER-002 —
      // demand an annotation in a directory this same file says L1/L2 do not
      // have. The resolution is that ATDD does not own them at all.
      expect(catalog).toContain("**Unit and Component owe no ATDD annotation.**");
      expect(catalog).toContain("QFAI-ATDD-117");
      expect(catalog).not.toContain("keep discharging every `TC-*` in `tests/integration/**`");
      expect(catalog).not.toContain("target state — **not enforced, do not follow yet**");
    });

    it(`${tree}: the exclusion names the gate that still covers L1/L2`, async () => {
      // Removing an obligation without naming its replacement would read as
      // "unit tests are ungated", which is not what happened.
      const catalog = await read(tree, CATALOG);
      expect(catalog).toContain("TDDLIST_TC_NOT_COVERED");
      expect(catalog).toContain("`/qfai-implement`");
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
      expect(flat(rules)).toContain("it says nothing about where the test file lives");
      // The SDD reference used to say every TC — unit/component included — is
      // discharged in `tests/integration/**`. That is the instruction
      // `QFAI-ATDD-112` no longer implements, and leaving it here would have
      // `/qfai-sdd` and `/qfai-atdd` hand an author opposite procedures.
      expect(flat(rules)).not.toContain("still discharged in `tests/integration/**`");
      expect(flat(rules)).toContain("**`L1`/`L2` owe no ATDD annotation at all**");
      expect(rules).toContain("TDDLIST_TC_NOT_COVERED");
    });
  }
});
