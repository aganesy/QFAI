/**
 * Integration: the triage approval check needs approval exactly where `requiresApproval()` does.
 *
 * One row per operation and sub-operation, each with `Approved By` `-` and no `Authorization-Ref`.
 * The operation set is held here; which of them need approval is `requiresApproval()`'s answer, so
 * the validator and the triage module cannot disagree.
 */
// QFAI:SPEC-0004:TC-0004-0074
import { afterEach, describe, expect, it } from "vitest";

import { requiresApproval, type TriageOp } from "../../../src/core/sddTriage.js";
import { removeTempTree } from "../../helpers/tempTree.js";
import { seedTriageProject, triageFindings, triageTable } from "../../helpers/triageFixture.js";

const HEADERS = ["Source", "Subject", "Existing Spec", "Operation", "Sub-op", "Approved By"];

const OPERATIONS: readonly TriageOp[] = [
  "CREATE",
  "DELETE",
  "SPLIT",
  "MERGE",
  "SUPERSEDE",
  { update: "APPEND" },
  { update: "MODIFY" },
  { update: "REMOVE" },
];

function label(op: TriageOp): string {
  return typeof op === "string" ? `R-${op}` : `R-UPDATE-${op.update}`;
}

function row(op: TriageOp): string[] {
  const existing = op === "CREATE" ? "-" : "spec-0001";
  const [operation, sub] = typeof op === "string" ? [op, "-"] : ["UPDATE", op.update];
  return [label(op), "change the example", existing, operation, sub, "-"];
}

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

describe("TC-0004-0074: one approval set", () => {
  it("TC-0004-0074: QFAI-TRIAGE-005 on exactly the rows requiresApproval() is true for", async () => {
    const root = await seedTriageProject(triageTable(HEADERS, OPERATIONS.map(row)));
    roots.push(root);

    const flagged = (await triageFindings(root))
      .filter((finding) => finding.code === "QFAI-TRIAGE-005")
      .map((finding) => finding.refs?.[0] ?? "")
      .sort();
    const expected = OPERATIONS.filter((op) => requiresApproval(op))
      .map(label)
      .sort();

    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(OPERATIONS.length);
    expect(flagged).toEqual(expected);
  });
});
