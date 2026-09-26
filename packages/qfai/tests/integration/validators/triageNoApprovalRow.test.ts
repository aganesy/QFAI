/**
 * Integration: a reference on a row that needs no approval is never checked.
 *
 * An `UPDATE` / `APPEND` row whose `Authorization-Ref` resolves to no file raises no triage finding:
 * `requiresApproval()` is false for it, so the reference is not read.
 */
// QFAI:SPEC-0004:TC-0004-0079
import { afterEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../../helpers/tempTree.js";
import { seedTriageProject, triageFindings, triageTable } from "../../helpers/triageFixture.js";

const HEADERS = [
  "Source",
  "Subject",
  "Existing Spec",
  "Operation",
  "Sub-op",
  "Approved By",
  "Depends-On",
  "Authorization-Ref",
];

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

describe("TC-0004-0079: no check where no approval is needed", () => {
  it("TC-0004-0079: an UPDATE / APPEND row whose Authorization-Ref resolves to no file raises no triage finding", async () => {
    const row = [
      "R-APPEND",
      "extend the example",
      "spec-0001",
      "UPDATE",
      "APPEND",
      "-",
      "-",
      "run-20260101000000000/auth-missing",
    ];
    const root = await seedTriageProject(triageTable(HEADERS, [row]));
    roots.push(root);

    expect(await triageFindings(root)).toEqual([]);
  });
});
