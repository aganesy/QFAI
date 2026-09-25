/**
 * Integration: implement takes a test fix only for a unit-layer row.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0026
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0026 (TDD-0034): Implement Takes a Test Fix Only for a Unit-Layer Row", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `test-fix`",
      ),
    );
    expect(text, "the ## `test-fix` section exists").not.toBe("");
    expect(text).toMatch(
      /takes a test fix for a `Unit` row, a `Component` row, and an `Integration` row whose test cases are all `L1` or `L2`/i,
    );
    expect(text).toMatch(
      /takes none of an `E2E` row, an `API` row, or an `Integration` row with a test case at any other level/i,
    );
    expect(text).toMatch(
      /one `L3` test case among `L1` and `L2` cases makes the row `qfai-atdd`'s/i,
    );
  });
});
