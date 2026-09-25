/**
 * E2E: an interrupted run continues at its pending work (spec-0018).
 *
 * On a `qfai init` project, a feature run is interrupted with its implement work order
 * outstanding. `resume` from a new session returns that work order for the pending ledger row,
 * keeps the recorded RED receipt valid, and issues no specification work again.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  LEDGER_FILE,
  RED_RECEIPT,
  receiptsOf,
  runWithReceipts,
  writeReceiptFiles,
} from "../integration/workflow/receiptRun.js";
import {
  commitAll,
  field,
  initProject,
  removeProjects,
  workflow,
} from "../integration/workflow/workflowProject.js";

afterEach(removeProjects);

// QFAI:SPEC-0018:US-0018-0005
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0005 (TDD-0459): resume returns the pending ledger row's implement work order and no SDD work order", async () => {
  const root = await initProject();
  await writeReceiptFiles(root);
  commitAll(root);
  const { runId, outstanding } = await runWithReceipts(root, false);
  const ledger = await readFile(path.join(root, LEDGER_FILE));

  const resumed = workflow(root, ["resume", "--run", runId]);

  expect({
    interrupted: field(outstanding.json, "workOrder.stageKind"),
    resumed: field(resumed.json, "workOrder.stageKind"),
    sameOrder:
      field(resumed.json, "workOrder.workOrderId") ===
      field(outstanding.json, "workOrder.workOrderId"),
    rows: field(resumed.json, "workOrder.ledger.rowIds"),
    red: receiptsOf(resumed.json)[RED_RECEIPT],
    ledgerKept: (await readFile(path.join(root, LEDGER_FILE))).equals(ledger),
  }).toEqual({
    interrupted: "implement",
    resumed: "implement",
    sameOrder: true,
    rows: ["TDD-0001"],
    red: "valid",
    ledgerKept: true,
  });
}, 180_000);
