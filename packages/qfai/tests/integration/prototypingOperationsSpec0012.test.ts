/**
 * Integration: the prototype stage serves exactly the operations the workflow vocabulary gives it.
 *
 * Reads the shipped `qfai-prototyping/references/orchestrated-mode.md`. The workflow core's refusal
 * of an unknown operation is not this module's.
 */
// QFAI:SPEC-0012:TC-0012-0492
import { describe, expect, it } from "vitest";

import { operationsOf, readShipped } from "../helpers/shippedAssistant.js";

describe("qfai-prototyping in a workflow run", () => {
  it("TC-0012-0492 (TDD-0579): The Operations table lists exactly existing-runtime-contract", async () => {
    const { header, ids } = operationsOf(
      await readShipped("skills/qfai-prototyping/references/orchestrated-mode.md"),
    );
    expect(header, "the first table under ## Operations is headed Operation").toBe("Operation");
    expect([...ids].sort()).toEqual(["existing-runtime-contract"]);
  });
});
