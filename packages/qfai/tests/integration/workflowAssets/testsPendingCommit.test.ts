/**
 * Integration: how the verify stage treats the missing tests of a scope that writes the
 * specification and leaves out the implement stage. The QFAI gate still runs the full scan and
 * fails, lists those missing tests as pending, and the commit is made when they are its only errors.
 *
 * Reads the shipped `STEP.md` files. How a session follows them is not this module's.
 */
import { expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

async function section(step: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(`step/${step}/STEP.md`), heading));
  expect(text, `${step} has ${heading}`).not.toBe("");
  return text;
}

// BR-0015-0336
// QFAI:AC-0001-0229-08
it("a testsPending scope fails the full-scan gate, lists its missing tests pending, and still commits", async () => {
  const pending = await section("verify-qfai-gate", "### Test obligations a scope leaves pending");
  expect(await section("verify-qfai-gate", "## What this gate is")).toMatch(
    /This gate is full-scan/,
  );
  expect(pending).toContain(
    "The scan stays full, and the gate is still `FAIL` when validation reports any error.",
  );
  expect(pending).toMatch(
    /lists as `PENDING` each `QFAI-STORY-006` error for a BF, AC or EX the run's specification stage wrote/,
  );

  const procedure = await section("verify-commit", "## Procedure");
  expect(procedure).toMatch(
    /A QFAI gate `FAIL` whose only errors are the `QFAI-STORY-006` obligations it listed `PENDING` under a `testsPending` scope.*does not stop the commit\./,
  );
  expect(procedure).toContain("Any other error of that gate still stops the commit.");
  expect(await section("verify-commit", "## Gate")).toMatch(
    /Each `QFAI-STORY-006` obligation the QFAI gate listed `PENDING` appears in the final report as pending/,
  );
});
