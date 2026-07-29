import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/relevant-test-suite.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe('"relevant test suite" is defined and bounded', () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the Refactor step defines the selector and its fallback`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      expect(skill).toContain("smallest selector that covers the module you touched");
      expect(skill).toContain("**plus its reverse dependency closure**");
      expect(skill).toContain("the package containing the touched module");
      expect(skill).toContain("references/relevant-test-suite.md");
      expect(skill).not.toContain("Run the full relevant test suite");
    });

    it(`${tree}: the selector follows the production import graph, not just test imports`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("Walk the **production** import graph backwards");
      // The indirect-dependent shape the direct-import scan misses.
      expect(section).toContain("`X` <- `Y` (production) <- `Y`'s test");
      expect(section).toContain("Searching test files for a direct import of `X` is not enough");
      // An unresolvable graph must widen, never narrow.
      expect(section).toContain("whenever the reverse walk cannot be completed");
      expect(section).toContain("Incomplete resolution always widens; it never narrows");
    });

    it(`${tree}: the wide run has a stated cadence, not a per-item cost`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const section = unwrap(await read(tree, REFERENCE));
      expect(skill).toContain("narrow suite per item, full suite at each checkpoint boundary");
      expect(skill).toContain("quadratic in ledger size");
      expect(section).toContain("### Checkpoint boundaries");
      expect(section).toContain("The full suite runs at, and only at");
      // Item 11 must not re-impose the full suite on every item.
      expect(skill).not.toContain(
        "Checkpoint verification passed — this is where the **full** suite runs",
      );
      expect(skill).toContain(
        "The **full** suite is required here only when the item sits on a checkpoint boundary",
      );
      // ...while still running at least once per spec.
      expect(skill).toContain("the last ledger row is always a boundary");
    });

    it(`${tree}: a boundary failure uses no backward transition`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("### A boundary failure is an anomaly, not a rollback");
      expect(section).toContain("Backward transitions stay prohibited");
      expect(section).toContain("transitions to `exception` with a DR-ID");
      expect(section).toContain("filed as a new `todo` row");
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
