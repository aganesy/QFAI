// QFAI:BF-0001
/**
 * E2E: an interrupted run continues at its pending work.
 *
 * On a `qfai init` project, a feature run is left with its implement work order outstanding
 * after the acceptance stage recorded RED. A new session told to continue finds that run with
 * `status`, a second `start` is refused naming it, and `resume` returns the same implement work
 * order at the first example no test annotates, with every prior receipt still valid. No story
 * or test file is rewritten, and no story-authoring work is issued again.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  EXAMPLE_IDS,
  STORY_FILES,
  approvedFeature,
  authorStory,
  throughAcceptance,
} from "./workflowFeatureRun.js";
import {
  START_INPUT,
  field,
  inbox,
  list,
  orderOf,
  removeProjects,
  workflow,
} from "./workflowJourney.js";
import { discussedProject } from "./workflowProjectInputs.js";

afterEach(removeProjects);

async function bytesOf(root: string, files: string[]): Promise<Buffer[]> {
  return Promise.all(files.map((rel) => readFile(path.join(root, rel))));
}

// Whether `resume` classed any receipt, and whether every one it classed is still valid: the
// receipts it returns beside the work order, and those the work order says it builds on.
function validities(document: unknown) {
  const receipts = [
    ...list(document, "classedReceipts"),
    ...list(document, "workOrder.priorStageReceiptRefs"),
  ];
  return {
    any: receipts.length > 0,
    allValid: receipts.every((receipt) => field(receipt, "validity") === "valid"),
  };
}

it("resume returns the outstanding implement work order at the pending example, and nothing upstream again", async () => {
  const root = await discussedProject();
  const { runId, create, sdd } = await approvedFeature(root);
  const story = await authorStory(root, runId, sdd.json, field(create, "questionId"));
  const { implement } = await throughAcceptance(root, runId, story.next.json);
  const before = await bytesOf(root, STORY_FILES);

  const found = workflow(root, ["status"]);
  const second = workflow(root, ["start", "--in", await inbox(root, null, "again", START_INPUT)]);
  const resumed = workflow(root, ["resume", "--run", runId]);
  const again = workflow(root, ["resume", "--run", runId]);

  expect({
    found: [field(found.json, "run.id") === runId, field(found.json, "run.state")],
    second: [second.status, field(second.json, "error.code"), field(second.json, "run.id")],
    resumed: orderOf(resumed.json).stageKind,
    operation: orderOf(resumed.json).operation,
    sameOrder:
      field(resumed.json, "workOrder.workOrderId") === field(implement, "workOrder.workOrderId"),
    stillSame:
      field(again.json, "workOrder.workOrderId") === field(implement, "workOrder.workOrderId"),
    checkpoint: field(resumed.json, "workOrder.checkpointRef"),
    receipts: validities(resumed.json),
    questions: list(found.json, "questions"),
    untouched: (await bytesOf(root, STORY_FILES)).every((bytes, index) =>
      bytes.equals(before[index] ?? Buffer.alloc(0)),
    ),
  }).toEqual({
    found: [true, "running"],
    second: [2, "run-active", runId],
    resumed: "implement",
    operation: "implement",
    sameOrder: true,
    stillSame: true,
    checkpoint: EXAMPLE_IDS[0],
    receipts: { any: true, allValid: true },
    questions: [],
    untouched: true,
  });
}, 600_000);
