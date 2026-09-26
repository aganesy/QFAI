// QFAI:BF-0001
/**
 * E2E: a run starts only on a host that can carry it.
 *
 * On a `qfai init` project, a host the command does not know and a capability report with a
 * gap are each refused at `start` and leave no run. A passing report starts one, and a first
 * stage whose delegation fails leaves it `blocked`, naming the missing capability.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  CAPABILITIES,
  DISCOVERY_PROPOSAL,
  START_INPUT,
  field,
  inbox,
  initProject,
  removeProjects,
  routedRun,
  submit,
  workflow,
} from "./workflowJourney.js";

afterEach(removeProjects);

const GAP = {
  ...START_INPUT,
  harness: { host: "claude-code", capabilities: { ...CAPABILITIES, delegateSubAgent: false } },
};
const UNKNOWN_HOST = { ...START_INPUT, harness: { host: "copilot", capabilities: CAPABILITIES } };

// A result reporting that the stage could not be delegated at all.
function undelegated(document: unknown) {
  return {
    resultId: "discussion-1",
    workOrderId: field(document, "workOrder.workOrderId"),
    stageInstanceId: field(document, "workOrder.stageInstanceId"),
    attempt: field(document, "workOrder.attempt"),
    expectedSequence: field(document, "workOrder.expectedSequence"),
    outcome: "unrun",
    testObservation: "unrun",
    actor: { agentInstance: "discussion-agent-1" },
    delegation: { status: "unavailable", attempt: 1 },
  };
}

async function refusal(root: string, name: string, input: unknown) {
  const refused = workflow(root, ["start", "--in", await inbox(root, null, name, input)]);
  return [refused.status, field(refused.json, "error.code"), field(refused.json, "error.cause")];
}

it("an unknown host and a capability gap are refused at start, and a failed first delegation blocks", async () => {
  const root = await initProject();
  const unknownHost = await refusal(root, "copilot", UNKNOWN_HOST);
  const gap = await refusal(root, "gap", GAP);
  const runsAfter = (await readdir(path.join(root, ".qfai", "run"))).filter((name) =>
    name.startsWith("run-"),
  );
  const { runId } = await routedRun(root, DISCOVERY_PROPOSAL);
  const issued = workflow(root, ["next", "--run", runId]);
  const blocked = await submit(root, runId, "accept", undelegated(issued.json));
  const status = workflow(root, ["status", "--run", runId]);

  expect({
    unknownHost,
    gap,
    runsAfter,
    stage: field(issued.json, "workOrder.stageKind"),
    state: [blocked.status, field(blocked.json, "run.state")],
    halt: [field(status.json, "halt.cause"), field(status.json, "halt.subjects")],
  }).toEqual({
    unknownHost: [2, "fail-closed", "unsupported-capability"],
    gap: [2, "fail-closed", "unsupported-capability"],
    runsAfter: [],
    stage: "discussion",
    state: [0, "blocked"],
    halt: ["unsupported-capability", ["delegateSubAgent"]],
  });
}, 300_000);
