// QFAI:EX-0001-0196-04

import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  RED_RECEIPT,
  STORY,
  TEST_FILE,
  receiptProject,
  receiptsOf,
  runWithReceipts,
} from "./receiptRun.js";
import { field, removeProjects, workflow } from "./workflowProject.js";

afterEach(removeProjects);

// The bytes of the story's examples and the test that annotates them.
async function readRecords(root: string): Promise<Buffer[]> {
  return Promise.all(
    [`${STORY}/03_Example.md`, TEST_FILE].map((file) => readFile(path.join(root, file))),
  );
}

it("Built CLI", async () => {
  const root = await receiptProject();
  const { runId } = await runWithReceipts(root, false);
  const before = await readRecords(root);
  const resumed = workflow(root, ["resume", "--run", runId]);
  const after = await readRecords(root);

  expect({
    stageKind: field(resumed.json, "workOrder.stageKind"),
    obligations: field(resumed.json, "workOrder.obligations.ids"),
    red: receiptsOf(resumed.json)[RED_RECEIPT],
    untouched: before.every((bytes, index) => after[index]?.equals(bytes)),
  }).toEqual({
    stageKind: "implement",
    obligations: ["AC-0001-0001-01", "BF-0001", "EX-0001-0001-01"],
    red: "valid",
    untouched: true,
  });
}, 120_000);
