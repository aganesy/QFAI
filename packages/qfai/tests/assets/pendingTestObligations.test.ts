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
      const [gate, repo, commit, output] = await Promise.all([
        read(tree, "assistant/step/verify-qfai-gate/STEP.md"),
        read(tree, "assistant/step/verify-repo-gate/STEP.md"),
        read(tree, "assistant/step/verify-commit/STEP.md"),
        read(tree, "assistant/skill/qfai-verify/references/verify-output-contract.md"),
      ]);
      const pending = flat(sectionOf(gate, "### Test obligations a scope leaves pending"));

      expect(flat(sectionOf(gate, "## What this gate is"))).toMatch(/This gate is full-scan/);
      expect(pending).toContain(
        "The scan stays full, and the gate is still `FAIL` when validation reports any error.",
      );
      expect(pending).toMatch(
        /lists as `PENDING` each `QFAI-STORY-006` error for a BF, AC or EX the run's specification stage wrote, with its uncovered ID and its flow/,
      );
      expect(pending).toMatch(
        /A `QFAI-STORY-006` error for an ID the run did not write, and every other error, is an ordinary failure/,
      );
      expect(pending).not.toMatch(/`PASS`|QFAI-STORY-00[789]/);
      expect(flat(sectionOf(gate, "## Gate"))).not.toContain("testsPending` scope, no error");
      expect(flat(repo)).toMatch(
        /Under a `testsPending` scope, the `QFAI-STORY-006` obligations `verify-qfai-gate` lists as `PENDING` are not repaired: the loop neither writes their tests, reruns a gate for them nor escalates them.*Every other failure, of the QFAI gate included, keeps the loop\./,
      );
      expect(flat(gate)).toContain(
        "runs the fix loop over every failure except the test obligations this gate lists as pending",
      );
      expect(flat(sectionOf(commit, "## Procedure"))).toContain(
        "Every nondelegated gate must pass, except as the `testsPending` exception at the end of this item says.",
      );
      expect(flat(sectionOf(commit, "## Procedure"))).toMatch(
        /A QFAI gate `FAIL` whose only errors are the `QFAI-STORY-006` obligations it listed `PENDING` under a `testsPending` scope.*does not stop the commit\. The gate stays `FAIL` in the report\. Any other error of that gate still stops the commit\./,
      );
      expect(flat(sectionOf(commit, "## Gate"))).toMatch(
        /Each `QFAI-STORY-006` obligation the QFAI gate listed `PENDING` appears in the final report as pending, saying that its test comes with the implement stage/,
      );
      expect(flat(output)).toMatch(
        /the gate and `status` stay `"FAIL"`, and `verify-commit` decides whether that failure stops the commit/,
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
