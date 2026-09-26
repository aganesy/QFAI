/**
 * Integration: the layer decision is made from the current spec and ledger.
 *
 * Reads the shipped `qfai-atdd/references/orchestrated-mode.md`, where the skill keeps what it
 * does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0008:TC-0008-0024
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-atdd in a workflow run", () => {
  it("TC-0008-0024 (TDD-0032): The Layer Decision Is Made From the Current Spec and Ledger", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-atdd/references/orchestrated-mode.md"),
        "## The layer decision",
      ),
    );
    expect(text, "the ## The layer decision section exists").not.toBe("");
    expect(text).toMatch(/a shared Stage 0 snapshot is reused only for the inputs it covers/i);
    expect(text).toMatch(
      /the layer each obligation needs is decided from the current spec and ledger at every stage start/i,
    );
    expect(text).toMatch(/it is never taken from the snapshot/i);
  });
});
