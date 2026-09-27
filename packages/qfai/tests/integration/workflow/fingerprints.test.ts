// QFAI:SPEC-0018:TC-0018-0112
// QFAI:SPEC-0018:TC-0018-0113
// QFAI:SPEC-0018:TC-0018-0114
// QFAI:SPEC-0018:TC-0018-0115
// QFAI:SPEC-0018:TC-0018-0116
// Fault seeds: FAULT-017, FAULT-018, FAULT-019

import { readFile, utimes } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  AC_FILE,
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

it("TC-0018-0112 (TDD-0330): Git fixture with recorded receipts", async () => {
  const { outstanding, resumed, receipts } = await resumedAfter((root) =>
    write(root, "README.md", "# An unrelated change\n"),
  );

  expect({
    validities: [...new Set(validities(receipts))],
    workOrder: field(resumed.json, "workOrder.workOrderId"),
  }).toEqual({
    validities: ["valid"],
    workOrder: field(outstanding.json, "workOrder.workOrderId"),
  });
}, 120_000);

it("TC-0018-0113 (TDD-0331): Change the text of an AC the test and implementation receipts depend on", async () => {
  const { resumed, receipts } = await resumedAfter((root) =>
    write(root, AC_FILE, "# Acceptance criteria\n\nAC-0001-0001: the lines are exported as TSV.\n"),
  );

  expect({
    validities: validities(receipts),
    reissued: field(resumed.json, "workOrder.stageKind"),
  }).toEqual({ validities: ["valid", "valid", "stale", "stale"], reissued: "acceptance" });
}, 120_000);

it("TC-0018-0114 (TDD-0332): Add a file matching an input glob, leaving every existing file's hash unchanged", async () => {
  const { receipts } = await resumedAfter((root) =>
    write(root, "src/extra.ts", "export const extra = 1;\n"),
  );

  expect({ red: receipts[RED_RECEIPT], green: receipts[GREEN_RECEIPT] }).toEqual({
    red: "valid",
    green: "stale",
  });
}, 120_000);

it("TC-0018-0115 (TDD-0333): Record RED, then change the production file", async () => {
  const { receipts } = await resumedAfter((root) =>
    write(root, PRODUCTION_FILE, "export const exportCsv = () => ['a', 'b', 'c'];\n"),
  );

  expect({ red: receipts[RED_RECEIPT], green: receipts[GREEN_RECEIPT] }).toEqual({
    red: "valid",
    green: "stale",
  });
}, 120_000);

it("TC-0018-0116 (TDD-0334): mtime-only", async () => {
  const { receipts } = await resumedAfter(async (root) => {
    const later = new Date(Date.now() + 60_000);
    await utimes(path.join(root, PRODUCTION_FILE), later, later);
  });

  expect([...new Set(validities(receipts))]).toEqual(["valid"]);
}, 120_000);

it("TC-0018-0116 (TDD-0335): same-bytes-rewrite", async () => {
  const { receipts } = await resumedAfter(async (root) => {
    const file = path.join(root, PRODUCTION_FILE);
    await write(root, PRODUCTION_FILE, await readFile(file, "utf8"));
  });

  expect([...new Set(validities(receipts))]).toEqual(["valid"]);
}, 120_000);
