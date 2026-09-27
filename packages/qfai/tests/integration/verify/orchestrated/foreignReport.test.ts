/**
 * Integration: a report from elsewhere is never offered as this run's.
 *
 * Reads the shipped `qfai-verify/references/orchestrated-mode.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0038
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0038 (TDD-0043): A report from elsewhere is never offered as this run's", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-verify/references/orchestrated-mode.md"),
        "## The stage result",
      ),
    );
    expect(text, "the ## The stage result section exists").not.toBe("");
    expect(text).toMatch(
      /a `verify\.json` written by another run, for another spec or kept in a shared location is never named as this stage's report/i,
    );
  });
});
