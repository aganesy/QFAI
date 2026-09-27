/**
 * Integration: the appended test case is recorded as an approval-free delta row.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0046
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0046: The append is recorded as an approval-free delta row", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-phase-checklists.md"),
        "### Defect row seeding",
      ),
    );
    expect(text, "the ### Defect row seeding section exists").not.toBe("");
    expect(text).toMatch(
      /record the appended test case as one `UPDATE` \/ `APPEND` row in the spec's `09_delta\.md` triage table, with `Approved By` `-`/i,
    );
  });
});
