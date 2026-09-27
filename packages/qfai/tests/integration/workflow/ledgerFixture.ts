/**
 * A real ledger file in a temp project, and a run whose work order was issued against it: the
 * decision function reads the ledger through the observer, and the issued events are folded
 * the way the journal folds them.
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowSnapshot } from "../../../src/core/workflow/decide.js";
import { ledgerFactsOf } from "../../../src/core/workflow/observe.js";
import { foldRecord, recordsOf } from "../../../src/core/workflow/persistence.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const HEADER = [
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
];

export const DONE_ROW =
  "| TDD-0001 | TC-0001-0001 | Unit | tests/a.test.ts | TC-0001-0001 (TDD-0001) | done | - | `.qfai/evidence/implement-spec-0001.md#tdd-0001` |";
export const TODO_ROW =
  "| TDD-0002 | TC-0001-0002 | Unit | tests/a.test.ts | TC-0001-0002 (TDD-0002) | todo | - | - |";
export const ADDED_ROW =
  "| TDD-0003 | TC-0001-0003 | Unit | tests/a.test.ts | TC-0001-0003 (TDD-0003) | todo | - | - |";

const roots: string[] = [];

export async function removeLedgerProjects(): Promise<void> {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
}

export function ledgerPath(root: string): string {
  return path.join(root, ".qfai", "specs", "spec-0001", "tdd", "test-list.md");
}

export async function writeLedger(root: string, rows: string[]): Promise<string> {
  const text = ["# TDD Test List", "", ...HEADER, ...rows, ""].join("\n");
  await writeFile(ledgerPath(root), text);
  return text;
}

const PLANS: Record<string, [string, string, string, string][]> = {
  "bounded-change": [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
    ["bounded-implement", "implement", "qfai-implement", "implement"],
    ["bounded-verify", "verify", "qfai-verify", "verify-full"],
  ],
  bugfix: [
    ["diagnose", "diagnose", "qfai-implement", "diagnose"],
    ["append", "sdd_append", "qfai-sdd", "append-missing-test-row"],
    ["verify", "verify", "qfai-verify", "verify-full"],
  ],
};

function readySnapshot(route: string): WorkflowSnapshot {
  const stages = (PLANS[route] ?? []).map(([stageInstanceId, stageKind, skill, operation]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when: "always",
  }));
  const [first] = stages;
  return {
    run: { id: "run-20260925000000000", state: "ready", sequence: 6 },
    plan: { route, stages },
    specBinding: { specId: "spec-0001" },
    acceptedStages: first
      ? [
          {
            stageInstanceId: first.stageInstanceId,
            stageKind: first.stageKind,
            outcome: "accepted",
          },
        ]
      : [],
    ...(route === "bugfix"
      ? { diagnosis: { verdict: "missing-test", reproductionRef: "repro.md", matchedRowIds: [] } }
      : {}),
  };
}

/** A temp project holding the ledger, and the run snapshot after `next` issued the stage. */
export async function issuedAgainstLedger(route: string, rows: string[]) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-"));
  roots.push(root);
  await mkdir(path.dirname(ledgerPath(root)), { recursive: true });
  await writeLedger(root, rows);
  const before = readySnapshot(route);
  const ledger = await ledgerFactsOf(root, "spec-0001");
  const issued = decide(before, { operation: "next" }, ledger ? { ledger } : {});
  const records = recordsOf(issued, { operation: "next", before: before.run });
  const snapshot = records.reduce(
    (folded, record) => foldRecord(folded, { ...record, prevHash: null }),
    before,
  );
  return { root, snapshot, workOrder: issued.verdict.workOrder };
}

/** Decides `accept` of an accepted result for the outstanding work order, reading the ledger. */
export async function acceptAgainstLedger(root: string, snapshot: WorkflowSnapshot) {
  const workOrder = snapshot.outstandingWorkOrder;
  const ledger = await ledgerFactsOf(root, "spec-0001");
  const result = {
    resultId: "result-1",
    workOrderId: workOrder?.workOrderId ?? "",
    stageInstanceId: workOrder?.stageInstanceId ?? "",
    attempt: workOrder?.attempt ?? 0,
    expectedSequence: snapshot.run.sequence,
    outcome: "accepted",
    testObservation: "not_applicable",
  };
  return decide(snapshot, { operation: "accept", result }, ledger ? { ledger } : {});
}
