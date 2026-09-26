// QFAI:SPEC-0018:TC-0018-0108

import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  LEDGER_FILE,
  RED_RECEIPT,
  receiptProject,
  receiptsOf,
  runWithReceipts,
} from "./receiptRun.js";
import { field, removeProjects, workflow } from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0108 (TDD-0327): Built CLI", async () => {
  const root = await receiptProject();
  const { runId } = await runWithReceipts(root, false);
  const ledger = await readFile(path.join(root, LEDGER_FILE));
  const resumed = workflow(root, ["resume", "--run", runId]);

  expect({
    stageKind: field(resumed.json, "workOrder.stageKind"),
    rows: field(resumed.json, "workOrder.ledger.rowIds"),
    red: receiptsOf(resumed.json)[RED_RECEIPT],
    ledger: (await readFile(path.join(root, LEDGER_FILE))).equals(ledger),
  }).toEqual({ stageKind: "implement", rows: ["TDD-0001"], red: "valid", ledger: true });
}, 120_000);
