// QFAI:SPEC-0018:TC-0018-0071
// QFAI:SPEC-0018:TC-0018-0072

import { readFile } from "node:fs/promises";

import { afterEach, expect, it } from "vitest";

import {
  acceptAgainstLedger,
  ADDED_ROW,
  DONE_ROW,
  issuedAgainstLedger,
  ledgerPath,
  removeLedgerProjects,
  TODO_ROW,
  writeLedger,
} from "./ledgerFixture.js";

afterEach(removeLedgerProjects);

it("TC-0018-0071 (TDD-0312): An implement result after which the ledger holds one more row", async () => {
  const { root, snapshot } = await issuedAgainstLedger("bounded-change", [DONE_ROW, TODO_ROW]);
  await writeLedger(root, [DONE_ROW, TODO_ROW, ADDED_ROW]);
  const error = (await acceptAgainstLedger(root, snapshot)).verdict.error;

  expect({
    stageKind: snapshot.outstandingWorkOrder?.stageKind,
    reasons: error && "reasons" in error ? error.reasons : undefined,
  }).toEqual({
    stageKind: "implement",
    reasons: [{ reason: "ledger-row-added", subject: "TDD-0003" }],
  });
});

it("TC-0018-0072 (TDD-0313): An sdd_append result after which the ledger holds one more row", async () => {
  const { root, snapshot } = await issuedAgainstLedger("bugfix", [DONE_ROW, TODO_ROW]);
  await writeLedger(root, [DONE_ROW, TODO_ROW, ADDED_ROW]);
  const decision = await acceptAgainstLedger(root, snapshot);
  const doneRow = (await readFile(ledgerPath(root), "utf8"))
    .split("\n")
    .find((line) => line.startsWith("| TDD-0001 "));

  expect({
    stageKind: snapshot.outstandingWorkOrder?.stageKind,
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    doneRow,
  }).toEqual({ stageKind: "sdd_append", ok: true, state: "ready", doneRow: DONE_ROW });
});
