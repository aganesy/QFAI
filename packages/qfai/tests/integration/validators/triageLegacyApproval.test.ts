/**
 * Integration: a row with `-` in `Authorization-Ref` keeps the legacy approval check.
 *
 * A `DELETE` row with `-` in `Authorization-Ref` and in `Approved By` raises `QFAI-TRIAGE-005` as
 * the same row does without the column, and no `QFAI-TRIAGE-011`. The row with no column at all is
 * held by the existing triage-validator tests.
 */
// QFAI:SPEC-0004:TC-0004-0078
import { afterEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../../helpers/tempTree.js";
import { seedTriageProject, triageFindings, triageTable } from "../../helpers/triageFixture.js";

const BASE = ["Source", "Subject", "Existing Spec", "Operation", "Sub-op", "Approved By"];
const WITH_REF = [...BASE, "Depends-On", "Authorization-Ref"];
const DELETE_ROW = ["R-DELETE", "retire the example", "spec-0001", "DELETE", "-", "-"];

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function codesFor(headers: string[], cells: string[]): Promise<string[]> {
  const root = await seedTriageProject(triageTable(headers, [cells]));
  roots.push(root);
  return (await triageFindings(root)).map((finding) => finding.code).sort();
}

describe("TC-0004-0078: a row without a reference keeps the legacy check", () => {
  it("TC-0004-0078: a DELETE row with - in Authorization-Ref raises QFAI-TRIAGE-005 as without the column", async () => {
    const withoutColumn = await codesFor(BASE, DELETE_ROW);
    const withDash = await codesFor(WITH_REF, [...DELETE_ROW, "-", "-"]);

    expect(withoutColumn).toContain("QFAI-TRIAGE-005");
    expect(withDash).toEqual(withoutColumn);
    expect(withDash).not.toContain("QFAI-TRIAGE-011");
  });
});
