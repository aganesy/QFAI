// QFAI:SPEC-0018:TC-0018-0070

import { readFile } from "node:fs/promises";

import { afterEach, expect, it } from "vitest";

import {
  acceptAgainstLedger,
  DONE_ROW,
  issuedAgainstLedger,
  ledgerPath,
  removeLedgerProjects,
  TODO_ROW,
  writeLedger,
} from "./ledgerFixture.js";

afterEach(removeLedgerProjects);

it("TC-0018-0070 (TDD-0311): A real ledger file", async () => {
  const { root, snapshot } = await issuedAgainstLedger("bounded-change", [DONE_ROW, TODO_ROW]);
  const moved = await writeLedger(root, [DONE_ROW.replace("| done |", "| todo |"), TODO_ROW]);
  const decision = await acceptAgainstLedger(root, snapshot);

  expect({
    stageKind: snapshot.outstandingWorkOrder?.stageKind,
    error: decision.verdict.error,
    events: decision.events,
    ledger: await readFile(ledgerPath(root), "utf8"),
  }).toEqual({
    stageKind: "implement",
    error: {
      code: "invalid-input",
      message: expect.any(String),
      reasons: [{ reason: "ledger-done-moved", subject: "TDD-0001" }],
    },
    events: [],
    ledger: moved,
  });
});
