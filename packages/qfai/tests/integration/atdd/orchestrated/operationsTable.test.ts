/**
 * Integration: the Operations table lists exactly the ATDD operations.
 *
 * Reads the shipped `qfai-atdd/references/orchestrated-mode.md`, where the skill keeps what it
 * does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0008:TC-0008-0020
import { describe, expect, it } from "vitest";

import { operationsOf, readShipped } from "../../../helpers/shippedAssistant.js";

describe("qfai-atdd in a workflow run", () => {
  it("TC-0008-0020 (TDD-0028): The Operations Table Lists Exactly the ATDD Operations", async () => {
    const { header, ids } = operationsOf(
      await readShipped("skills/qfai-atdd/references/orchestrated-mode.md"),
    );
    expect(header).toBe("Operation");
    expect([...ids].sort()).toEqual(["author-acceptance-tests", "test-fix"]);
  });
});
