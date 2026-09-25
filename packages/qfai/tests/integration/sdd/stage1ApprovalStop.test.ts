/**
 * Integration: a routing-time approval that fails the Stage 1 check persists nothing.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0039
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0039: A failed approval check persists nothing", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-triage.md"),
        "## Inside a workflow run",
      ),
    );
    expect(text, "the ## Inside a workflow run section exists").not.toBe("");
    expect(text).toMatch(
      /a missing, mismatched or stale approval persists no triage row and asks the operator nothing/i,
    );
    expect(text).toMatch(/the stage returns `awaiting_input` naming the row and the reason/i);
    expect(text).toMatch(
      /an approval is stale when the scope digest it was given under changes, when the approved capability text changes, or when a replan widens the scope/i,
    );
    expect(text).toMatch(/the clock alone never makes an approval stale/i);
  });
});
