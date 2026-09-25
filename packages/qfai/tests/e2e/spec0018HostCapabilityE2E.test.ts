/**
 * E2E: a run starts only on a host that can carry it (spec-0018).
 *
 * On a `qfai init` project, a capability report with a gap is refused at `start`, naming the
 * capability, and leaves no run; a passing report starts one, and a first stage whose delegation
 * fails leaves it `blocked`, naming the missing capability.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  CAPABILITIES,
  field,
  inbox,
  initProject,
  removeProjects,
  routedRun,
  START_INPUT,
  submit,
  workflow,
} from "../integration/workflow/workflowProject.js";

afterEach(removeProjects);

const GAP = {
  ...START_INPUT,
  harness: { host: "claude-code", capabilities: { ...CAPABILITIES, delegateSubAgent: false } },
};

// A result reporting that the stage could not be delegated at all.
function undelegated(document: unknown) {
  const workOrder = field(document, "workOrder");
  return {
    resultId: "discussion-1",
    workOrderId: field(workOrder, "workOrderId"),
    stageInstanceId: field(workOrder, "stageInstanceId"),
    attempt: field(workOrder, "attempt"),
    expectedSequence: field(workOrder, "expectedSequence"),
    outcome: "unrun",
    delegation: { status: "unavailable", attempt: 1 },
  };
}

// QFAI:SPEC-0018:US-0018-0009
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0009 (TDD-0463): a capability gap is refused at start, and a failed first delegation blocks", async () => {
  const root = await initProject();
  const refused = workflow(root, ["start", "--in", await inbox(root, null, "gap", GAP)]);
  const runsAfterGap = (await readdir(path.join(root, ".qfai", "runs"))).filter((name) =>
    name.startsWith("run-"),
  );
  const { runId } = await routedRun(root);
  const issued = workflow(root, ["next", "--run", runId]);
  const blocked = await submit(root, runId, "accept", undelegated(issued.json));

  expect({
    refused: [
      refused.status,
      field(refused.json, "error.code"),
      field(refused.json, "error.cause"),
      field(refused.json, "error.subjects"),
    ],
    runsAfterGap,
    stage: field(issued.json, "workOrder.stageKind"),
    state: field(blocked.json, "run.state"),
    halt: field(blocked.json, "halt"),
  }).toEqual({
    refused: [2, "fail-closed", "unsupported-capability", ["delegateSubAgent"]],
    runsAfterGap: [],
    stage: "discussion",
    state: "blocked",
    halt: { cause: "unsupported-capability", owner: "operator", subjects: ["delegateSubAgent"] },
  });
}, 180_000);
