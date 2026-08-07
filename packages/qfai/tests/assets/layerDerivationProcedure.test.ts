import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Collapses every whitespace run to one space.
 *
 * The rule is the sentence; the column prettier happens to wrap it at is not.
 * Encoding the wrap (`"let a\n   wrong implementation"`) made a reflow — which
 * changes no meaning — read as a policy regression.
 */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** Wrap-tolerant `toContain`: both sides are flattened before comparison. */
function expectPhrase(content: string, phrase: string): void {
  expect(flat(content)).toContain(flat(phrase));
}

const ANCHOR = "test-layers.md#layer-derivation-procedure-normative";

describe("deriving a TC's layer is a published procedure", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the SSOT states the rule and one example per layer`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("## Layer derivation procedure (normative)");
      expectPhrase(catalog, "whose removal would let a wrong implementation pass");
      for (const layer of ["L1 Unit", "L2 Component", "L3 Integration", "L4 API", "L5 E2E"]) {
        expect(catalog).toContain(layer);
      }
      expect(catalog).toContain("### Worked examples");
    });

    it(`${tree}: a spanning obligation has one stated resolution`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("**Split the row.** One TC = one oracle = one layer.");
      expect(catalog).toContain("A multi-valued `Level` cell (`L3/L5`) is **illegal**");
      expect(catalog).toContain("escalate through the Drift Protocol");
    });

    it(`${tree}: the direction of authority is stated as an anti-pattern`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expectPhrase(
        catalog,
        "**The layer is never inferred from how a test happens to be driven.**",
      );
    });

    it(`${tree}: step 2 is declared to outrank step 3`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("**Step 2 outranks step 3.**");
      expect(catalog).toContain("`response.body.price` over HTTP, reads as L1");
    });

    it(`${tree}: the derived Level does not move the annotation`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("### Annotation routing");
      for (const code of [
        "QFAI-ATDD-111",
        "QFAI-ATDD-112",
        "QFAI-ATDD-113",
        "QFAI-ATDD-121",
        "QFAI-ATDD-122",
      ]) {
        expect(catalog).toContain(code);
      }
      expect(catalog).toContain("**A `TC-*` row's `Level` stays within L1–L3.**");
      expectPhrase(
        catalog,
        "**An L1/L2 `Level` carries no `QFAI-ATDD-112` obligation, and the gate does not change the `Level`.**",
      );
      // The derived Level records the oracle; it must not be rewritten to make
      // a gate quieter, and the gate it used to trip is no longer ATDD's.
      // Wrap-tolerant: the sentence is the rule, its wrap column is not.
      expectPhrase(catalog, "Never rewrite a derived L1/L2 to L3");
      expect(catalog).toContain("depend on implementation order");
      expect(catalog).toContain("TDDLIST_TC_NOT_COVERED");
    });

    it(`${tree}: re-filing an L4/L5 obligation keeps the EX→TC edge satisfiable`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      // Removing the TC row on its own would orphan the EX it verified, which
      // `qfai validate --profile sdd --fail-on error` rejects. The procedure
      // must therefore describe the re-file as an upstream chain move.
      expect(catalog).toContain("**Re-filing is an upstream change, never a bare row deletion.**");
      for (const code of ["QFAI-COV-201", "QFAI-COV-202", "QFAI-COV-203"]) {
        expect(catalog).toContain(code);
      }
      expectPhrase(catalog, "Move the whole chain in one change through the Drift Protocol");
      expect(catalog).toContain("split the row instead");
    });

    it(`${tree}: the gates cite the procedure`, async () => {
      expect(await read(tree, "assistant/skills/qfai-atdd/SKILL.md")).toContain(ANCHOR);
      expect(await read(tree, "assistant/skills/qfai-implement/SKILL.md")).toContain(ANCHOR);
      expect(await read(tree, "assistant/skills/qfai-sdd/SKILL.md")).toContain(ANCHOR);
    });

    it(`${tree}: the Level is per-TC while the annotation routing stays enforced`, async () => {
      const sdd = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      // The routing table is cited, not restated. Inlining `TC→Integration`
      // republished the per-TC pin this PR withdraws, and it would have to be
      // re-edited in two places every time the catalog's routing changes.
      expectPhrase(
        sdd,
        "annotation routing is enforced by `.qfai/assistant/catalog/test-layers.md#annotation-routing`",
      );
      expect(sdd).not.toContain("TC→Integration");
      expectPhrase(sdd, "`TC-*`'s `Level` is **not** a constant");
      expectPhrase(sdd, "keeping the row inside L1–L3");
      expectPhrase(sdd, "A missing `tests/integration/**` trace never rewrites a derived `Level`.");
    });

    it(`${tree}: the TC template points authors at the procedure`, async () => {
      const template = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
      );
      expect(template).toContain(ANCHOR);
      expect(template).toContain("One oracle per TC");
    });
  }
});
