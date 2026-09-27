/**
 * Integration: defect row seeding appends one test case and one ledger row, with no Change Request.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's row-set check is
 * not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0043
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0043: Defect row seeding appends one case and one row", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-phase-checklists.md"),
        "### Defect row seeding",
      ),
    );
    expect(text, "the ### Defect row seeding section exists").not.toBe("");
    expect(text).toMatch(/under a workflow work order of operation `defect-row-seeding`/i);
    expect(text).toMatch(/for behaviour the spec already states/i);
    expect(text).toMatch(
      /append exactly one test case to `06_Test-Cases\.md` and one ledger row to `tdd\/test-list\.md`\. File no Change Request\./i,
    );
    expect(text).toMatch(
      /the test case's `Notes` give the diagnosed defect and the run ID, and no path under `\.qfai\/runs\/`/i,
    );
  });
});
