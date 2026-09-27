/**
 * Integration: the ledger check is made on the current ledger.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0017
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0017 (TDD-0025): The Ledger Check Is Made on the Current Ledger", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## The ledger check",
      ),
    );
    expect(text, "the ## The ledger check section exists").not.toBe("");
    expect(text).toMatch(/snapshot is reused only for the inputs it covers/i);
    expect(text).toMatch(
      /the bound ledger is read and checked by the stage itself at every stage start/i,
    );
    expect(text).toMatch(/never taken from the snapshot/i);
  });
});
