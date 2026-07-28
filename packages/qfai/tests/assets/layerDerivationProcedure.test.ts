import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const ANCHOR = "test-layers.md#layer-derivation-procedure-normative";

describe("deriving a TC's layer is a published procedure", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the SSOT states the rule and one example per layer`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("## Layer derivation procedure (normative)");
      expect(catalog).toContain("whose removal would let a\n   wrong implementation pass");
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
      expect(catalog).toContain(
        "**The layer is never inferred from\nhow a test happens to be driven.**",
      );
    });

    it(`${tree}: the gates cite the procedure`, async () => {
      expect(await read(tree, "assistant/skills/qfai-atdd/SKILL.md")).toContain(ANCHOR);
      expect(await read(tree, "assistant/skills/qfai-implement/SKILL.md")).toContain(ANCHOR);
      expect(await read(tree, "assistant/skills/qfai-sdd/SKILL.md")).toContain(ANCHOR);
    });

    it(`${tree}: the per-TC pinning claim is withdrawn`, async () => {
      const sdd = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(sdd).not.toContain("(US→E2E, TC→Integration, CON-API→API)");
      expect(sdd).toContain("A `TC-*`'s layer is **not** pinned");
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
