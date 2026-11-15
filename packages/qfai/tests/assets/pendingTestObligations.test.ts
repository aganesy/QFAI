import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { flat, sectionOf } from "../helpers/shippedAssistant.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

// A scope that writes the specification and leaves out the implement stage cannot write the tests
// the specification asks for, so its gate and its commit treat those obligations as pending.
describe("a scope that leaves out the implement stage leaves its test obligations pending", () => {
  for (const tree of TREES) {
    // BR-0015-0336
    // QFAI:EX-0001-0229-35
    it(`${tree}: the QFAI gate records the obligations pending, and the commit is made`, async () => {
      const [gate, commit, output] = await Promise.all([
        read(tree, "assistant/step/verify-qfai-gate/STEP.md"),
        read(tree, "assistant/step/verify-commit/STEP.md"),
        read(tree, "assistant/skill/qfai-verify/references/verify-output-contract.md"),
      ]);
      const pending = flat(sectionOf(gate, "### Test obligations a scope leaves pending"));

      expect(flat(sectionOf(gate, "## What this gate is"))).toMatch(/This gate is full-scan/);
      expect(pending).toContain("The scan stays full.");
      expect(pending).toMatch(
        /Record each `QFAI-STORY-006` through `QFAI-STORY-009` error as `PENDING`, with its uncovered ID and its flow, not as a failure/,
      );
      expect(pending).toContain("Every other error still fails the gate");
      expect(flat(sectionOf(commit, "## Procedure"))).toMatch(
        /only errors are the test obligations it recorded `PENDING` under a `testsPending` scope.*does not stop the commit\. Any other error of that gate still stops it\./,
      );
      expect(flat(sectionOf(commit, "## Gate"))).toMatch(
        /recorded `PENDING` is listed in the final report as pending, saying that its test comes with the implement stage/,
      );
      expect(flat(output)).toMatch(
        /except a test obligation the QFAI gate recorded pending under a `testsPending` plan scope/,
      );
    });

    // BR-0015-0336
    // QFAI:EX-0001-0229-36
    it(`${tree}: the scope question says a testsPending scope's tests come later`, async () => {
      const [screens, plan] = await Promise.all([
        read(tree, "assistant/skill/qfai-run/references/operator-screens.md"),
        read(tree, "assistant/skill/qfai-run/references/plan.md"),
      ]);

      expect(flat(sectionOf(screens, "## The scope question"))).toMatch(
        /the option for a scope with `testsPending` also says that its tests are written later, by the implementation stage it leaves out/,
      );
      expect(flat(sectionOf(plan, "## Scopes"))).toMatch(
        /holds `testsPending: true` when one of its stages writes `spec` and it leaves out a stage of kind `implement` the route has; no other scope holds the key/,
      );
    });
  }
});
