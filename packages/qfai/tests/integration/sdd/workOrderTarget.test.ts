/**
 * Integration: a work order with no target is refused rather than run as the no-argument batch.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's own checks are
 * not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0047
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0047: A work order without a target is refused", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/orchestrated-mode.md"),
        "## Operations",
      ),
    );
    expect(text, "the ## Operations section exists").not.toBe("");
    expect(text).toMatch(
      /a work order with no target is refused\. It never runs the no-argument batch\./i,
    );
    expect(text).toMatch(
      /a `new_capability` target's result reports `bindings` for each capability created/i,
    );
  });
});
