/**
 * Integration: a missing environment blocks the stage.
 *
 * Reads the shipped `qfai-verify/references/orchestrated-mode.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0044
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0044 (TDD-0050): A missing environment blocks the stage", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-verify/references/orchestrated-mode.md"),
        "## A missing environment",
      ),
    );
    expect(text, "the ## A missing environment section exists").not.toBe("");
    expect(text).toMatch(
      /returns the stage `blocked`, with the blocker `stage-blocked` and `operator` as the one who clears it/i,
    );
    expect(text).toMatch(/no debt is listed for it/i);
  });
});
