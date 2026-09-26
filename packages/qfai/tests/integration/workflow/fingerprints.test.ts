// QFAI:AC-0001-0196-03
// QFAI:EX-0001-0196-07
// QFAI:EX-0001-0196-08
// Fault seeds: FAULT-017, FAULT-018, FAULT-019

import { readFile, utimes } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  AC_FILE,
  criteria,
  GREEN_RECEIPT,
  PRODUCTION_FILE,
  RED_RECEIPT,
  receiptProject,
  receiptsOf,
  runWithReceipts,
  write,
} from "./receiptRun.js";
import { field, removeProjects, workflow } from "./workflowProject.js";

afterEach(removeProjects);

// A run holding RED and GREEN receipts, changed by `change`, then resumed.
async function resumedAfter(change: (root: string) => Promise<void>) {
  const root = await receiptProject();
  const { runId, outstanding } = await runWithReceipts(root, true);
  await change(root);
  const resumed = workflow(root, ["resume", "--run", runId]);
  return { outstanding, resumed, receipts: receiptsOf(resumed.json) };
}

function validities(receipts: Record<string, unknown>): unknown[] {
  return Object.values(receipts);
}

it("Git fixture with recorded receipts", async () => {
  // Inside the run's write scope, so the run change boundary admits it, and outside every file
  // and glob a receipt reads.
  const { outstanding, resumed, receipts } = await resumedAfter((root) =>
    write(root, ".qfai/spec/02_business-flow/README.md", "# An unrelated change\n"),
  );

  expect({
    validities: [...new Set(validities(receipts))],
    workOrder: field(resumed.json, "workOrder.workOrderId"),
  }).toEqual({
    validities: ["valid"],
    workOrder: field(outstanding.json, "workOrder.workOrderId"),
  });
}, 120_000);

it("Change the text of an AC the test and implementation receipts depend on", async () => {
  const { resumed, receipts } = await resumedAfter((root) => write(root, AC_FILE, criteria("TSV")));

  expect({
    validities: validities(receipts),
    reissued: field(resumed.json, "workOrder.stageKind"),
  }).toEqual({ validities: ["valid", "valid", "stale", "stale"], reissued: "acceptance" });
}, 120_000);

it("Add a file matching an input glob, leaving every existing file's hash unchanged", async () => {
  const { receipts } = await resumedAfter((root) =>
    write(root, "src/extra.ts", "export const extra = 1;\n"),
  );

  expect({ red: receipts[RED_RECEIPT], green: receipts[GREEN_RECEIPT] }).toEqual({
    red: "valid",
    green: "stale",
  });
}, 120_000);

it("Record RED, then change the production file", async () => {
  const { receipts } = await resumedAfter((root) =>
    write(root, PRODUCTION_FILE, "export const exportCsv = () => ['a', 'b', 'c'];\n"),
  );

  expect({ red: receipts[RED_RECEIPT], green: receipts[GREEN_RECEIPT] }).toEqual({
    red: "valid",
    green: "stale",
  });
}, 120_000);

it("mtime-only", async () => {
  const { receipts } = await resumedAfter(async (root) => {
    const later = new Date(Date.now() + 60_000);
    await utimes(path.join(root, PRODUCTION_FILE), later, later);
  });

  expect([...new Set(validities(receipts))]).toEqual(["valid"]);
}, 120_000);

it("same-bytes-rewrite", async () => {
  const { receipts } = await resumedAfter(async (root) => {
    const file = path.join(root, PRODUCTION_FILE);
    await write(root, PRODUCTION_FILE, await readFile(file, "utf8"));
  });

  expect([...new Set(validities(receipts))]).toEqual(["valid"]);
}, 120_000);
