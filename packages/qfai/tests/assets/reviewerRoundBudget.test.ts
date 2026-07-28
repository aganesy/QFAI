import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";

describe("reviewer gates terminate", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the Reviewer Gate Baseline caps rounds and escalates`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("### Round budget (MUST)");
      expect(content).toContain("**Two rounds per reviewer per artifact.**");
      expect(content).toContain("MUST stop and escalate to the user");
      expect(content).toContain("MUST NOT\n  start another round");
      expect(content).toContain("Escalation is not failure");
    });

    it(`${tree}: a later-round finding must justify itself`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("### Convergence (MUST)");
      expect(content).toContain("MUST state why it was not raisable in\n  round N-1");
      expect(content).toContain("out of budget");
      expect(content).toContain("MUST NOT open a new blocking *class*");
    });

    it(`${tree}: each stage's reviewer remit is bounded`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("### Reviewer remit (in scope per stage)");
      for (const stage of [
        "/qfai-discussion",
        "/qfai-sdd",
        "/qfai-atdd",
        "/qfai-implement",
      ]) {
        expect(content).toContain(stage);
      }
      expect(content).toContain("Out of scope (record and defer)");
    });

    it(`${tree}: the autorepair protocol covers reviewer verdicts and round count`, async () => {
      const content = await read(tree, OPERATING);
      expect(content).toContain("or when a blocking reviewer returns `FAIL` / `REVISE`");
      expect(content).toContain("stop on **round count** as well as on lack of progress");
      expect(content).toContain("shared-skill-delegation-baseline.md#round-budget-must");
    });
  }
});
