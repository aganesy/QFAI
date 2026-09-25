/**
 * Integration: the Operations table lists exactly the implement operations.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0014
import { describe, expect, it } from "vitest";

import { operationsOf, readShipped } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0014 (TDD-0022): The Operations Table Lists Exactly the Implement Operations", async () => {
    const { header, ids } = operationsOf(
      await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
    );
    expect(header).toBe("Operation");
    expect([...ids].sort()).toEqual([
      "diagnose-only",
      "implement",
      "regression-fix",
      "seam-only",
      "test-fix",
    ]);
  });
});
