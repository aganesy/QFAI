/**
 * Integration: a regression fix leaves the `done` row `done`.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0022
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0022 (TDD-0030): A Regression Fix Leaves the done Row done", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `regression-fix`",
      ),
    );
    expect(text, "the ## `regression-fix` section exists").not.toBe("");
    expect(text).toMatch(/the fix changes production code only/i);
    expect(text).toMatch(/no cell of the ledger row is edited, and its `Status` stays `done`/i);
    expect(text).toMatch(/no Change Request is filed and no evidence is deleted/i);
    expect(text).toMatch(/the row is never reopened or moved back/i);
    expect(text).not.toMatch(/may (?:change|edit)[^.]*`Status`/i);
  });
});
