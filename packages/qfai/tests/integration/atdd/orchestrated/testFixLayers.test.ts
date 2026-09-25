/**
 * Integration: ATDD takes a test fix only for an acceptance-layer row.
 *
 * Reads the shipped `qfai-atdd/references/orchestrated-mode.md`, where the skill keeps what it
 * does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0008:TC-0008-0027
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-atdd in a workflow run", () => {
  it("TC-0008-0027 (TDD-0035): ATDD Takes a Test Fix Only for an Acceptance-Layer Row", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-atdd/references/orchestrated-mode.md"),
        "## `test-fix`",
      ),
    );
    expect(text, "the ## `test-fix` section exists").not.toBe("");
    expect(text).toMatch(
      /this skill takes a test fix for an `E2E` row, an `API` row, and an `Integration` row with at least one test case at a level other than `L1` or `L2`/i,
    );
    expect(text).toMatch(
      /it takes none of a `Unit` row, a `Component` row, or an `Integration` row whose test cases are all `L1` or `L2`/i,
    );
    expect(text).toMatch(
      /one `L3` test case among `L1` and `L2` cases makes the row this skill's/i,
    );
  });
});
