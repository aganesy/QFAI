/**
 * Integration: a valid run binding supplies the primary spec without a question.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0015
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0015 (TDD-0023): A Valid Run Binding Supplies the Primary Spec Without a Question", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## The bound spec",
      ),
    );
    expect(text, "the ## The bound spec section exists").not.toBe("");
    expect(text).toMatch(/a work order whose target binds a spec supplies `primarySpecId`/i);
    expect(text).toMatch(/the User Selection Flow then puts no question/i);
    expect(text).toMatch(
      /with no work order, the User Selection Flow asks for confirmation, as it does when the skill is invoked by name/i,
    );
  });
});
