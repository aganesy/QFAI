/**
 * Integration: defect row seeding changes no upstream item and no existing row's status or evidence.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0044
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0044: Seeding changes no upstream item and no existing row's status or evidence", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-phase-checklists.md"),
        "### Defect row seeding",
      ),
    );
    expect(text, "the ### Defect row seeding section exists").not.toBe("");
    expect(text).toMatch(
      /the test case cites an existing AC in `AC-Refs`, and an existing EX, or `—`, in `EX-Ref`/i,
    );
    expect(text).toMatch(/add or change no US, AC, BR or EX/i);
    expect(text).toMatch(/the new row starts at `todo`/i);
    expect(text).toMatch(/every existing row keeps its `Status` and `Evidence`/i);
    expect(text).toMatch(
      /where the new row carries an obligation an existing row already carries, name a `Boundary` on the new row, and give the existing row its slug if it has none/i,
    );
    expect(text).toMatch(/that is the only cell written on an existing row/i);
  });
});
