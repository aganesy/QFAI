/**
 * Integration: the seeded row's layer comes from the missing test's oracle.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0045
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0045: The seeded row's layer comes from the oracle", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-phase-checklists.md"),
        "### Defect row seeding",
      ),
    );
    expect(text, "the ### Defect row seeding section exists").not.toBe("");
    expect(text).toMatch(
      /derive `Level` and `Layer` from the missing test's oracle by `\.qfai\/assistant\/catalog\/test-layers\.md`/i,
    );
    expect(text).toMatch(
      /an acceptance-layer row is left to ATDD and a unit-layer row to implement/i,
    );
    expect(text).toMatch(/this phase writes no test itself/i);
  });
});
