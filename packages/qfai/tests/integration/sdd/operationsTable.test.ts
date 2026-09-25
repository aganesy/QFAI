/**
 * Integration: the `/qfai-sdd` Operations table lists the vocabulary's operations.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0050
import { describe, expect, it } from "vitest";

import { operationsOf, readShipped } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0050: The Operations table lists the vocabulary's operations", async () => {
    const { header, ids } = operationsOf(
      await readShipped("skills/qfai-sdd/references/orchestrated-mode.md"),
    );
    expect(header).toBe("Operation");
    expect([...ids].sort()).toEqual([
      "defect-row-seeding",
      "delta-or-applicability-check",
      "new-capability",
    ]);
  });
});
