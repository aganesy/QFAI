/**
 * Integration: the Operations table lists exactly verify-full.
 *
 * Reads the shipped `qfai-verify/references/orchestrated-mode.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0043
import { describe, expect, it } from "vitest";

import { operationsOf, readShipped } from "../../../helpers/shippedAssistant.js";

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0043 (TDD-0048): The Operations table lists exactly verify-full", async () => {
    const { header, ids } = operationsOf(
      await readShipped("skills/qfai-verify/references/orchestrated-mode.md"),
    );
    expect(header).toBe("Operation");
    expect(ids).toEqual(["verify-full"]);
  });
});
