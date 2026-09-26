/**
 * Integration: the triage table format documents the optional `Authorization-Ref` column.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The validator's own check of the
 * column is not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0042
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0042: The triage format carries Authorization-Ref", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-triage.md"),
        "## Triage table format",
      ),
    );
    expect(text, "the ## Triage table format section exists").not.toBe("");
    expect(text).toMatch(/`Authorization-Ref` is optional and found by its header name/i);
    expect(text).toMatch(/filled on an approval-required `CREATE` row only/i);
    expect(text).toMatch(/a row of any other operation carries no reference/i);
    expect(text).toMatch(
      /its value is `run-<17 digits>\/<authorizationId>`: the run, then the cited record/i,
    );
    expect(text).toMatch(/copies `answeredBy@YYYY-MM-DD` from the record into `Approved By`/i);
    expect(text).toMatch(/a row without the column, or with `-` in it, stays valid/i);
  });
});
