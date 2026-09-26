/**
 * Integration: the discussion's Operations table lists exactly the operation the plan vocabulary
 * gives `qfai-discussion`. Whether the shipped plans load against it is the workflow core's test.
 */
// QFAI:SPEC-0010:TC-0010-0016
import { describe, expect, it } from "vitest";

import { operationsOf, readShipped } from "../helpers/shippedAssistant.js";

describe("TC-0010-0016: the discussion's Operations table", () => {
  it("TC-0010-0016: the Operations table lists exactly resolve-unsettled-product-scope", async () => {
    const { header, ids } = operationsOf(
      await readShipped("skills/qfai-discussion/references/orchestrated-mode.md"),
    );
    expect(header).toBe("Operation");
    expect(ids).toEqual(["resolve-unsettled-product-scope"]);
  });
});
