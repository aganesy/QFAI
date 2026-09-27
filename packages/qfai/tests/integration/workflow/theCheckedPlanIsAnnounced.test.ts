// QFAI:AC-0001-0192-04

import { readdir } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  field,
  list,
  removeProjects,
  resultFor,
  startRun,
  submit,
  workflow,
} from "../../e2e/workflowJourney.js";
import { FLOW_ID, flowProject, proposalFor, withOtherFlows } from "./acceptanceRuns.js";

afterEach(removeProjects);

// Submits `proposal` as the routing result of a fresh run; returns the refusal or the plan.
async function routeWith(root: string, proposal: object) {
  const runId = await startRun(root);
  const routing = workflow(root, ["next", "--run", runId]);
  const journal = path.join(root, ".qfai", "run", runId, "journal");
  const before = await readdir(journal);
  const routed = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "route-1", { proposal }),
  );
  const status = workflow(root, ["status", "--run", runId]);
  return {
    runId,
    routed,
    unchanged: (await readdir(journal)).length === before.length,
    state: field(status.json, "run.state"),
  };
}

const refusal = (run: Awaited<ReturnType<typeof routeWith>>) => ({
  code: field(run.routed.json, "error.code"),
  reasons: list(run.routed.json, "error.reasons").map((each) => [
    field(each, "reason"),
    field(each, "subject"),
  ]),
  state: run.state,
  unchanged: run.unchanged,
});

it("A checked proposal becomes a plan holding the goal, the stages in plan order and the write scope", async () => {
  const root = await flowProject();
  const proposal = proposalFor("bounded-change", {
    expectedBehaviorRefs: [
      { kind: "request", ref: "request" },
      { kind: "flow-id", ref: FLOW_ID },
    ],
    observedRefs: [{ kind: "path", ref: "README.md" }],
  });
  const { routed } = await routeWith(root, proposal);

  expect({
    state: field(routed.json, "run.state"),
    goal: field(routed.json, "plan.goal"),
    stages: list(routed.json, "plan.stages").map((stage) => field(stage, "stageKind")),
    writeScope: field(routed.json, "plan.writeScope"),
    normative: field(routed.json, "plan.expectedBehaviorRefs"),
    observed: field(routed.json, "plan.observedRefs"),
    questions: list(routed.json, "questions"),
  }).toEqual({
    state: "ready",
    goal: "Allow ten notification addresses per customer.",
    stages: ["sdd_delta", "acceptance", "implement", "verify"],
    writeScope: [".qfai/spec/02_business-flow/business-flow-0001/**", "src/**", "tests/**"],
    normative: [
      { kind: "request", ref: "request" },
      { kind: "flow-id", ref: FLOW_ID },
    ],
    observed: [{ kind: "path", ref: "README.md" }],
    questions: [],
  });
}, 300_000);

it("An unknown flow, a missing path, a bare string and two flows are each refused, and routing stays where it was", async () => {
  const root = await flowProject();
  await withOtherFlows(root);
  const unknownFlow = await routeWith(
    root,
    proposalFor("bounded-change", {
      expectedBehaviorRefs: [{ kind: "flow-id", ref: "BF-9999" }],
      confidence: 1,
    }),
  );
  await submit(root, unknownFlow.runId, "decision", { stop: true, answeredBy: "operator" });
  const missingPath = await routeWith(
    root,
    proposalFor("bounded-change", { observedRefs: [{ kind: "path", ref: "Dockerfile" }] }),
  );
  await submit(root, missingPath.runId, "decision", { stop: true, answeredBy: "operator" });
  const bareString = await routeWith(
    root,
    proposalFor("bounded-change", { expectedBehaviorRefs: ["request"] }),
  );
  await submit(root, bareString.runId, "decision", { stop: true, answeredBy: "operator" });
  const twoFlows = await routeWith(
    root,
    proposalFor("bounded-change", { affectedFlowIds: [FLOW_ID, "BF-0002"] }),
  );

  expect({
    unknownFlow: refusal(unknownFlow),
    missingPath: refusal(missingPath),
    bareString: [refusal(bareString).code, refusal(bareString).reasons.map(([reason]) => reason)],
    twoFlows: [refusal(twoFlows).code, refusal(twoFlows).reasons.map(([reason]) => reason)],
  }).toEqual({
    unknownFlow: {
      code: "proposal-refused",
      reasons: [["unknown-id", "BF-9999"]],
      state: "routing",
      unchanged: true,
    },
    missingPath: {
      code: "proposal-refused",
      reasons: [["unknown-path", "Dockerfile"]],
      state: "routing",
      unchanged: true,
    },
    bareString: ["invalid-input", expect.arrayContaining(["schema"])],
    twoFlows: ["proposal-refused", ["flow-binding"]],
  });
}, 600_000);
