/**
 * Integration: the seam round trip returns to the same stage instance.
 *
 * Reads the shipped `qfai-atdd/references/orchestrated-mode.md`, where the skill keeps what it
 * does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0008:TC-0008-0023
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-atdd in a workflow run", () => {
  it("TC-0008-0023 (TDD-0031): The Seam Round Trip Returns to the Same Stage Instance", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-atdd/references/orchestrated-mode.md"),
        "## The seam round trip",
      ),
    );
    expect(text, "the ## The seam round trip section exists").not.toBe("");
    const steps = [
      /cannot reach its assertion for want of a route, an export or a module is returned `needs_repair` with a seam request \(`seamRequest`\) naming that test/i,
      /after the seam-only result is accepted, the same acceptance stage instance runs as a new attempt and takes RED at the assertion/i,
      /only then is the full implementation handed on/i,
    ];
    const at = steps.map((step) => text.search(step));
    for (const [index, position] of at.entries()) {
      expect(position, `step ${index + 1} is stated`).toBeGreaterThanOrEqual(0);
    }
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text).toMatch(/no second run starts/i);
    expect(text).toContain("`references/red-provenance.md`");
  });
});
